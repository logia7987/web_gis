package com.transit.web_gis.controller;

import com.transit.web_gis.service.ShapeService;
import com.transit.web_gis.service.ShpService;
import com.transit.web_gis.vo.ShpVo;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.locationtech.proj4j.*;
import org.locationtech.proj4j.CoordinateTransform;
import org.locationtech.proj4j.CoordinateTransformFactory;
import org.locationtech.proj4j.ProjCoordinate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.List;

@Controller
public class MainController {

    @Value("${mapbox.accessToken}")
    private String mapboxAccessToken;

    @Autowired
    private ShpService shpService;

    @Autowired
    private ShapeService shapeService;

    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");
//    private static final File tempDir = new File("/app/shapefile_temp");

    @GetMapping("/")
    public String mainView(Model model, HttpServletResponse response) {

        // 캐시 무효화 헤더 추가
        response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setDateHeader("Expires", 0);

        List<ShpVo> list = shapeService.selectShpList();
        for (int i = 0; i < list.size(); i++) {
            ShpVo aVo = list.get(i);

            String type = shapeService.getShpType(aVo.getTable_name());
            aVo.setShpType(type);
        }

        model.addAttribute("mapboxAccessToken", mapboxAccessToken);
        model.addAttribute("shpList", list);
        return "html/main/index";
    }

    @GetMapping("/popup/uploadPage")
    public String popupUpload(Model model, HttpSession session) throws IOException {

        // 세션에서 파일 경로 가져오기
        String jsonFilePath = (String) session.getAttribute("jsonFilePath");
        String fileName = (String) session.getAttribute("fileName");

        if (jsonFilePath != null) {
            File jsonFile = new File(jsonFilePath);
            try (FileReader reader = new FileReader(jsonFile)) {
                JSONParser parser = new JSONParser();
                JSONObject resultObj = new JSONObject();
                JSONObject jsonObj = (JSONObject) parser.parse(reader);

                resultObj.put("data", jsonObj);
                resultObj.put("fileName", fileName);

                model.addAttribute("jsonData", resultObj);
                model.addAttribute("fileName", fileName);
            } catch (IOException | ParseException e) {
                e.printStackTrace();
                model.addAttribute("error", "JSON 파일 읽기 중 오류 발생");
            }

            // 세션에서 파일 경로 제거 (필요에 따라)
            session.removeAttribute("jsonFilePath");
            session.removeAttribute("fileName");
            FileUtils.deleteDirectory(tempDir);
        }
        return "html/popup/modal_loadfile";
    }

    // shp 좌표계 테스트
    @RequestMapping("/test")
    @ResponseBody
    public static void main(String[] args) {
        try {
            // EPSG:2097 (Korean Transverse Mercator) PROJ 문자열 정의
            String projKTM = "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";

            // EPSG:4326 (WGS 84) PROJ 문자열 정의
            String projWGS84 = "+proj=longlat +datum=WGS84 +no_defs";

            // CoordinateTransformFactory 객체 생성
            CoordinateTransformFactory ctFactory = new CoordinateTransformFactory();

            // CRSFactory 객체 생성
            CRSFactory crsFactory = new CRSFactory();

            // 좌표계 정의
            CoordinateReferenceSystem sourceCRS = crsFactory.createFromParameters("source", projKTM);
            CoordinateReferenceSystem targetCRS  = crsFactory.createFromParameters("target", projWGS84);

            // 좌표계 변환 객체 생성
            CoordinateTransform transform = ctFactory.createTransform(sourceCRS, targetCRS );

            // EPSG:5186 좌표 (예: x=240299.4845, y=317987.5488)
            ProjCoordinate srcCoord = new ProjCoordinate(200000, 500000);
            ProjCoordinate destCoord = new ProjCoordinate();

            // 좌표 변환
            transform.transform(srcCoord, destCoord);

            System.out.println("Converted coordinates from EPSG:2097 to EPSG:4326:");
            System.out.println("Longitude: " + destCoord.x);
            System.out.println("Latitude: " + destCoord.y);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}