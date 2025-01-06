package com.transit.web_gis.controller;

import org.locationtech.proj4j.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

@RestController
public class ProxyController {

    private final RestTemplate restTemplate;

    public ProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/proxy/kakao-tiles")
    public ResponseEntity<byte[]> getKakaoTiles(@RequestParam int z, @RequestParam int y, @RequestParam int x) {
        // 1. Mapbox 타일 좌표를 위경도로 변환
        double n = Math.pow(2, z);
        double lon = x / n * 360 - 180;  // [-180, 180]
        double lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;  // [-85.05, 85.05]

        // 2. WGS84 위경도를 EPSG:5181로 변환
        double[] epsg5181 = convertToEPSG5181(lon, lat);

        // 3. 카카오 지도 설정값
        double[] resolutions = {2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5, 0.25};
        double originX = -30000;  // origin[0]
        double originY = -60000;  // origin[1]

        // bounds 계산
        double minX = -30000 - 4 * Math.pow(2, 19);  // bounds[0][0]
        double minY = -60000;                         // bounds[0][1]
        double maxX = 5 * Math.pow(2, 19) - 30000;   // bounds[1][0]
        double maxY = 5 * Math.pow(2, 19) - 60000;   // bounds[1][1]

        // 4. 줌 레벨 변환
        int kakaoZ = z - 11;  // Mapbox 15 -> 카카오 4
        kakaoZ = Math.min(13, Math.max(0, kakaoZ));

        // 5. 좌표를 bounds 내의 상대적 위치로 변환
        double relativeX = (epsg5181[0] - minX) / (maxX - minX);
        double relativeY = (maxY - epsg5181[1]) / (maxY - minY);  // Y축 반전

        // 6. 현재 줌 레벨에서의 타일 개수 계산
        int tilesAtZoom = 1 << kakaoZ;

        // 7. 타일 좌표 계산
        int kakaoX = (int) (relativeX * tilesAtZoom);
        int kakaoY = (int) (relativeY * tilesAtZoom);

        // 8. 범위 제한
        kakaoX = Math.max(0, Math.min(kakaoX, tilesAtZoom - 1));
        kakaoY = Math.max(0, Math.min(kakaoY, tilesAtZoom - 1));

        System.out.println("Coordinate Conversion:");
        System.out.println("Mapbox - Z: " + z + ", X: " + x + ", Y: " + y);
        System.out.println("WGS84 - Lon: " + lon + ", Lat: " + lat);
        System.out.println("EPSG:5181 - X: " + epsg5181[0] + ", Y: " + epsg5181[1]);
        System.out.println("Relative - X: " + relativeX + ", Y: " + relativeY);
        System.out.println("Tiles at zoom: " + tilesAtZoom);
        System.out.println("Kakao - Z: " + kakaoZ + ", X: " + kakaoX + ", Y: " + kakaoY);

        String url = String.format(
                "https://map.daumcdn.net/map_k3f_prod/bakery/image_map_png/PNG01/v26_gxuw0/%d/%d/%d.png",
                kakaoZ, kakaoY, kakaoX
        );

        try {
            byte[] imageBytes = restTemplate.getForObject(url, byte[].class);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(imageBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch tile", e);
        }
    }

    // Mapbox 타일 좌표를 EPSG:4326(위경도)로 변환
    private double[] convertFromTileToWGS84(int x, int y, int z) {
        double n = Math.pow(2, z);
        double lon = x / n * 360 - 180;
        double lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
        return new double[]{lon, lat};
    }

    // EPSG:4326(WGS84)에서 EPSG:5181(Korea 2000 / Central Belt)로 변환
    private double[] convertToEPSG5181(double lon, double lat) {
        // EPSG:5181 투영 파라미터
        double lambda0 = Math.toRadians(127.0); // 중부원점 경도
        double phi0 = Math.toRadians(38.0);    // 중부원점 위도
        double k0 = 1.0;                       // 축척계수
        double falseEasting = 200000.0;        // X 방향 가산값
        double falseNorthing = 500000.0;       // Y 방향 가산값

        // GRS80 타원체 파라미터
        double a = 6378137.0;                  // 장반경
        double f = 1.0 / 298.257222101;        // 편평률
        double e2 = 2 * f - f * f;             // 이심률의 제곱

        // 라디안 변환
        double phi = Math.toRadians(lat);
        double lambda = Math.toRadians(lon);

        // 계산
        double sinPhi = Math.sin(phi);
        double cosPhi = Math.cos(phi);
        double tanPhi = Math.tan(phi);

        double N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
        double T = tanPhi * tanPhi;
        double C = e2 * cosPhi * cosPhi / (1 - e2);
        double A = (lambda - lambda0) * cosPhi;

        // TM 좌표 계산
        double M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * phi
                - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*phi)
                + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*phi)
                - (35*e2*e2*e2/3072) * Math.sin(6*phi));

        double x = falseEasting + k0 * N * (A + (1 - T + C) * A*A*A/6
                + (5 - 18*T + T*T + 72*C - 58) * A*A*A*A*A/120);

        double y = falseNorthing + k0 * (M + N * tanPhi * (A*A/2
                + (5 - T + 9*C + 4*C*C) * A*A*A*A/24
                + (61 - 58*T + T*T + 600*C - 330) * A*A*A*A*A*A/720));

        return new double[]{x, y};
    }

    // EPSG:5181 좌표를 카카오 타일 좌표로 변환
    private int[] convertToKakaoTileCoords(double x, double y, int z) {
        // 카카오 지도의 기준 영역 (한반도 영역)
        double minX = 122.99;  // 서쪽 경도
        double maxX = 132.0;   // 동쪽 경도
        double minY = 33.0;    // 남쪽 위도
        double maxY = 43.0;    // 북쪽 위도

        // 타일 크기 계산
        int numTiles = 1 << z;  // 2^z
        double tileWidth = (maxX - minX) / numTiles;
        double tileHeight = (maxY - minY) / numTiles;

        // 타일 좌표 계산
        int tileX = (int) ((x - minX) / tileWidth);
        int tileY = (int) ((maxY - y) / tileHeight);

        // 범위 제한
        tileX = Math.max(0, Math.min(tileX, numTiles - 1));
        tileY = Math.max(0, Math.min(tileY, numTiles - 1));

        return new int[]{tileX, tileY};
    }
}
