package com.transit.web_gis.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.transit.web_gis.service.*;
import com.transit.web_gis.vo.BmsVo;
import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.GeometryVo;
import com.transit.web_gis.vo.ShpVo;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.opengis.referencing.FactoryException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.json.Json;
import javax.json.JsonArray;
import javax.json.JsonArrayBuilder;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.DecimalFormat;
import java.util.*;
import java.util.concurrent.CompletableFuture;


@Controller
@RequestMapping("/api")
public class ApiController {
    private static final String LINK_FEATURE_ID = "link-feature";
    private static final String STATION_ICON_ID = "station-icon";
    private static final String STATION_FEATURE_ID = "station-feature";
    //라벨 크기 및 위치
    private static final Integer STATION_ICON_SIZE = 1;
    private static final Integer STATION_LABEL_SIZE = 12;
    private static final Integer STATION_LABEL_OPACITY = 1;
    private static final List<Integer> STATION_LABEL_OFFSET = new ArrayList<>(Arrays.asList(0, 1));

    private static final String NODE_ICON_ID = "node-icon";
    private static final String NODE_FEATURE_ID = "node-feature";


    @Autowired
    private ShpService shpService;

    @Autowired
    private FeatureService featureService;

    @Autowired
    private GeometryService geometryService;

    @Autowired
    private ShapeService shapeService;

    @Autowired
    private BmsService bmsService;

    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");
    private static final File geoDir = new File("C:\\mapbox\\geoJson");

    @PostMapping(value = "/uploadShapeFiles", consumes = "multipart/form-data", produces = "application/json; charset=UTF-8")
    @ResponseBody
    public Map<String, Object> uploadShapeFiles(@RequestParam("shpData") List<MultipartFile> files, HttpSession session) throws IOException, ParseException {
        Map<String, Object> result = new HashMap<>();

        try {
            FileUtils.forceMkdir(tempDir);
            FileUtils.forceMkdir(geoDir);
            for (MultipartFile aFile : files) {
                Path filePath = new File(tempDir, Objects.requireNonNull(aFile.getOriginalFilename())).toPath();
                Files.copy(aFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            }

            File shpFile = shapeService.findFile(tempDir, ".shp");

            if (shpFile != null) {
                try {
                    File prjFile = shapeService.findFile(tempDir, ".prj");
                    if (prjFile != null) {
                        String crs = String.valueOf(shapeService.extractCRS(prjFile));
                        result.put("crs", crs);
                    }

                    CompletableFuture<String> jsonResultFuture = CompletableFuture.supplyAsync(() -> {
                        try {
                            return shapeService.convertShpToGeoJSON(shpFile, tempDir);
                        } catch (IOException | FactoryException e) {
                            throw new RuntimeException(e);
                        }
                    });

                    String jsonResult = String.valueOf(jsonResultFuture.join());

                    System.out.println("JSON 넘어왔음");
                    JSONParser jsonParser = new JSONParser();

                    Object obj = jsonParser.parse(jsonResult);
                    JSONObject jsonObj = (JSONObject) obj;

                    System.out.println("데이터 준비");

                    // JSON 데이터를 파일로 저장
                    File jsonFile = new File(geoDir, shpFile.getName().replace(".shp", "") + ".json");
                    try (FileWriter fileWriter = new FileWriter(jsonFile)) {
                        fileWriter.write(jsonObj.toJSONString());
                    }
                    System.out.println("데이터 전송");
                    // 파일 경로를 세션에 저장
                    session.setAttribute("jsonFilePath", jsonFile.getAbsolutePath());
                    // dataArr 에서 구분자로 사용할 파일명
                    session.setAttribute("fileName", shpFile.getName().replace(".shp", ""));
                    System.out.println("데이터 전송 완료");
                } catch (Exception e) {
                    e.printStackTrace();
                    result.put("error", "Shp to GeoJSON 변환 중 오류 발생");
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            result.put("error", "파일 처리 중 오류 발생");
        }

        return result;
    }

    @PostMapping(value = "/getShp", produces = "application/json; charset=UTF-8")
    @ResponseBody
    public Map<String, Object>getShp(@RequestParam("shpId") String shpId) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (shpId != null) {
                ShpVo shpVo = shpService.getShp(Long.valueOf(shpId));
                String shpName = shpVo.getShpName();
                List<FeatureVo> features = featureService.getFeatures(shpVo);
                for (FeatureVo feature: features) {
                    feature.setGeometryVo(geometryService.getGeometryByFeature(feature));
                }

                result.put("result", "success");
                result.put("shpName", shpName);
                result.put("data", convertToGeoJson(features));
            } else {
                result.put("result", "fail");
                result.put("message", "불러오는데 실패했습니다. 관리자에게 문의해주세요.");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    @PostMapping(value = "/saveShp")
    @ResponseBody
    public ShpVo saveShpData(@RequestParam(value = "shpName") String shpName) {
        ShpVo shpVo = new ShpVo();
        shpVo.setShpName(shpName);
        return shpService.saveShp(shpVo);
    }

    @PostMapping(value = "/saveFeature")
    @ResponseBody
    public Map<String, Object> saveFeature(@RequestBody Map<String, Object>params) throws IOException {
        Map<String, Object> resultMap = new HashMap<>();

        Long shpId = Long.valueOf((int) params.get("shpId"));
        int seq = Integer.valueOf(params.get("seq")+"");

        ShpVo shpVo = shpService.getShp(Long.valueOf(shpId));

        Map<String, Object> dataMap = (Map<String, Object>) params.get("jsonObject");

        FeatureVo featureVo = new FeatureVo();
        featureVo.setShpVo(shpVo);
        featureVo.setSeq(seq);
        featureVo.setType((String) dataMap.get("type"));
        featureVo.setProperties(convertToJSONString(String.valueOf(dataMap.get("properties"))));

        FeatureVo nFeature = featureService.saveFeature(featureVo);

        Map<String, Object> geometry = (Map<String, Object>) dataMap.get("geometry");
        GeometryVo geometryVo = new GeometryVo();
        geometryVo.setFeatureVo(nFeature);
        geometryVo.setType((String) geometry.get("type"));
//        geometryVo.setCoordinates(geometry.toString());
        geometryVo.setCoordinates(geometry.get("coordinates").toString());

        geometryService.saveGeometry(geometryVo);

        return params;
    }

    @ResponseBody
    @RequestMapping(value="/getData.do", method=RequestMethod.POST)
    public HashMap<String, Object> getData(@RequestBody Map<String, Object> params) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        HashMap<String, Object> commandMap = new HashMap<>();

        double sc_NE_LNG = (double) params.get("sc_NE_LNG");
        double sc_NE_LAT = (double) params.get("sc_NE_LAT");
        double sc_SW_LNG = (double) params.get("sc_SW_LNG");
        double sc_SW_LAT = (double) params.get("sc_SW_LAT");
        String sc_MODE = (String) params.get("sc_MODE");
        String fileName = (String) params.get("fileName");

        ObjectMapper objectMapper = new ObjectMapper();
        String[] fileNames = objectMapper.readValue(fileName, String[].class);

        // 배열 초기화
        List<String> tNameList = new ArrayList<>();
        for (String aFileName : fileNames) {
            commandMap.put("sc_NE_LNG", sc_NE_LNG);
            commandMap.put("sc_NE_LAT", sc_NE_LAT);
            commandMap.put("sc_SW_LNG", sc_SW_LNG);
            commandMap.put("sc_SW_LAT", sc_SW_LAT);
            commandMap.put("fileName", aFileName);

            List<Map<String, Object>> resultData = shapeService.getShpData(commandMap);
            String shpType = (String) resultData.get(0).get("SHP_TYPE");

            switch (shpType) {
                case "node" -> resultMap.put(aFileName + "_data", getGeoJsonNode(shapeService.getShpData(commandMap)));
                case "link" -> resultMap.put(aFileName + "_data", getGeoJsonLink(shapeService.getShpData(commandMap)));
                case "station" -> resultMap.put(aFileName + "_data", getGeoJsonStation(shapeService.getShpData(commandMap)));
            }
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value="/updateGeometry.do", method=RequestMethod.POST)
    public HashMap<String, Object> updateGeometry(@RequestBody Map<String, Object> params) {
        HashMap<String, Object> resultMap = new HashMap<>();
        HashMap<String, Object> commandMap = new HashMap<>();

        String type = (String) params.get("type");
        Map<String, Object> feature = (Map<String, Object>) params.get("feature");
        System.out.println(feature);
        Map<String, Object> properties = (Map<String, Object>) feature.get("properties");
        switch (type) {
            case "node":
                List<Double> geometryNode = (List<Double>) ((Map<String, Object>) feature.get("geometry")).get("coordinates");
                // 좌표값 추출
                Double lng = geometryNode.get(0);
                Double lat = geometryNode.get(1);

                // commandMap에 값 설정
                commandMap.put("nodeId", properties.get("nodeId"));
                commandMap.put("lng", lng);
                commandMap.put("lat", lat);

                if (bmsService.updateNodeGeometry(commandMap) > 0) {
                    resultMap.put("result", "success");
                } else {
                    resultMap.put("result", "fail");
                }
                break;
            case "station":
                List<Double> geometryLink = (List<Double>) ((Map<String, Object>) feature.get("geometry")).get("coordinates");
                // 좌표값 추출
                lng = geometryLink.get(0);
                lat = geometryLink.get(1);

                commandMap.put("stationId", properties.get("stationId"));
                commandMap.put("lng", lng); // double 형식으로 변환
                commandMap.put("lat", lat); // double 형식으로 변환
                System.out.println("stationId : " + commandMap.get("stationId"));
                if (bmsService.updateStationGeometry(commandMap) > 0) {
                    resultMap.put("result", "success");
                } else {
                    resultMap.put("result", "fail");
                }
                break;
            case "link":
                commandMap.put("linkId", properties.get("linkId"));
                // 기존의 링크 좌표리스트 우선 제거
                if (bmsService.deleteOldLinkGeometry(commandMap) > 0) {
                    // 변경 전 정보 삭제 후 정보 재입력
                    List<List<Double>> geometry = (List<List<Double>>) ((Map<String, Object>) feature.get("geometry")).get("coordinates");

                    for (int i = 0; i < geometry.size(); i++) {
                        commandMap.put("lng", geometry.get(i).get(0));
                        commandMap.put("lat", geometry.get(i).get(1));
                        commandMap.put("linkSeq", i);

                        if (bmsService.updateNewLinkGeometry(commandMap) > 0) {
                            // 성공처리
                            resultMap.put("result", "success");
                        } else {
                            // 실패처리 2
                            resultMap.put("result", "fail");
                        }
                    }
                } else {
                    // 실패처리 1
                    resultMap.put("result", "fail");
                }
                break;
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value="/uploadShpTable", method=RequestMethod.POST)
    public void saveShpFileTable(@RequestParam("fileName") String tableName,
                                 @RequestParam("idxArr") String idxArr,
                                 @RequestParam("isAllChecked") boolean isAllChecked,
                                 @RequestParam("shpType") String shpType,
                                 @RequestParam("label") String label) {

        System.out.println(idxArr);
        System.out.println(isAllChecked + "");

        shapeService.saveSelectedFeatures(tableName, idxArr, isAllChecked, shpType, label);
    }

    public JSONObject convertToGeoJson(List<FeatureVo> features) throws ParseException, IOException {
        JSONObject result = new JSONObject();
        result.put("type", "FeatureCollection");

        JSONArray jsonFeatures = new JSONArray();
        for (FeatureVo feature : features) {
            JSONObject jsonFeature = new JSONObject();
            jsonFeature.put("type", feature.getType());
            jsonFeature.put("id", feature.getSeq());
            jsonFeature.put("properties", parseStringToMap(feature.getProperties()));

            GeometryVo geometryVos = feature.getGeometryVo();
            JSONObject jsonGeometry = new JSONObject();

            jsonGeometry.put("type", geometryVos.getType());
            jsonGeometry.put("coordinates", parseStringToArray(geometryVos.getCoordinates(), String.valueOf(feature.getSeq())));

            jsonFeature.put("geometry", jsonGeometry);
            jsonFeatures.add(jsonFeature);
        }
        result.put("features", jsonFeatures);

        return result;
    }

    private static Map<String, Object> parseStringToMap(String input) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        return objectMapper.readValue(input, Map.class);
    }

    private static JSONArray parseStringToArray(String jsonString, String id) throws IOException {
        try {
            JSONArray coordinateInArr = new JSONArray();

            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode jsonNode = objectMapper.readTree(jsonString);

            if (jsonNode.isArray() && jsonNode.size() == 2) {
                // 단일 좌표쌍 처리
                JsonNode longitudeNode = jsonNode.get(0);
                JsonNode latitudeNode = jsonNode.get(1);

                if (longitudeNode != null && latitudeNode != null && longitudeNode.isNumber() && latitudeNode.isNumber()) {
                    double longitude = longitudeNode.asDouble();
                    double latitude = latitudeNode.asDouble();

                    coordinateInArr.add(longitude);
                    coordinateInArr.add(latitude);
                }
            } else {
                // Coordinate 에 접근
                for (JsonNode coordinatesNode : jsonNode) {
                    JSONArray coordinateOutArr = new JSONArray();

                    for (JsonNode node : coordinatesNode) {
                        JSONArray coordinateArr = new JSONArray();

                        for (JsonNode subNode : node) {
                            JSONArray aCoordinate = new JSONArray();

                            JsonNode longitudeNode = subNode.get(0);
                            JsonNode latitudeNode = subNode.get(1);

                            if (longitudeNode != null && latitudeNode != null && longitudeNode.isNumber() && latitudeNode.isNumber()) {
                                double longitude = longitudeNode.asDouble();
                                double latitude = latitudeNode.asDouble();

                                aCoordinate.add(longitude);
                                aCoordinate.add(latitude);
                            } else {
                                aCoordinate.add(subNode);
                            }

                            coordinateArr.add(aCoordinate);
                        }

                        coordinateOutArr.add(coordinateArr);
                    }
                    coordinateInArr.add(coordinateOutArr);
                }
            }

            return coordinateInArr;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private static String convertToJSONString(String input) throws IOException {
        System.out.println(input);
        input = input.trim();
        input = input.replaceAll("=(?=,|})", ":\"\"");
        input = input.replaceAll("(\\w+)=([^,{}]+)", "\"$1\":\"$2\"");
        input = input.replaceAll("(^|,\\s*)\"\":\"\"", "");
        return input;
    }

    private static JsonArray convertToJsonArray(String jsonCoordinates) {
        // JsonArrayBuilder 생성
        JsonArrayBuilder jsonArrayBuilder = Json.createArrayBuilder();

        // JSON 문자열을 파싱하여 JsonArray로 변환
        // 여기서는 간단하게 JsonArray의 첫 번째 요소로만 변환하였습니다.
        jsonArrayBuilder.add(Json.createReader(new StringReader(jsonCoordinates)).readArray());

        // 완성된 JsonArray 반환
        return jsonArrayBuilder.build();
    }

    public String getGeoJsonLink(List<Map<String, Object>> datas) throws Exception{
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(Map<String, Object> data : datas){
            JSONObject feature = new JSONObject();
            JSONObject properties = new JSONObject();
            JSONObject geometry = new JSONObject();
            JSONArray coordinates = new JSONArray();

            //feature 틀 생성
            feature.put("type", "Feature");
            feature.put("properties", properties);
            feature.put("geometry", geometry);
            geometry.put("type", "LineString");
            geometry.put("coordinates", coordinates);

            //properties 정류소 CSS 정보 데이터 삽입
            properties.put("featureId", LINK_FEATURE_ID);
            properties.put("label", "");
            properties.put("emptyLabel", "");

            //properties 정류소 속성 정보 데이터 삽입
            for( Map.Entry<String, Object> entry : data.entrySet() ){
                String strKey = entry.getKey();
                String strValue = (String) entry.getValue();

                if (strKey.equals("GEOMETRY")) {
//                    for(BmsVo coord : coords){
//                        List<Double> tmpCoord = new ArrayList<>(Arrays.asList(Double.parseDouble(coord.getLng()), Double.parseDouble(coord.getLat())));
//                        coordinates.add(tmpCoord);
//                    }
                } else {
                    properties.put(strKey, strValue);
                }
            }

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public String getGeoJsonStation(List<Map<String, Object>> datas) {
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(Map<String, Object> data : datas){
            JSONObject feature = new JSONObject();
            JSONObject properties = new JSONObject();
            JSONObject geometry = new JSONObject();
            JSONArray coordinates = new JSONArray();
            // .set 사용을 위한 공란 추가
            coordinates.add(0);
            coordinates.add(0);

            //feature 틀 생성
            feature.put("type", "Feature");
            feature.put("properties", properties);
            feature.put("geometry", geometry);
            geometry.put("type", "Point");
            geometry.put("coordinates", coordinates);

            //properties 정류소 CSS 정보 데이터 삽입
            properties.put("featureId", STATION_FEATURE_ID);
            properties.put("iconId", STATION_ICON_ID);
            properties.put("label", "");
            properties.put("emptyLabel", "");

            //properties 정류소 속성 정보 데이터 삽입
            for( Map.Entry<String, Object> entry : data.entrySet() ){
                String strKey = entry.getKey();
                String strValue = (String) entry.getValue();
                properties.put(strKey, strValue);

                //geometry 데이터 삽입
                if (strKey.equals("LAT")) {
                    coordinates.set(1, Double.parseDouble(strValue));
                } else if (strKey.equals("LNG")) {
                    coordinates.set(0, Double.parseDouble(strValue));
                }
            }

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public String getGeoJsonNode(List<Map<String, Object>> datas){
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(Map<String, Object> data : datas){
            JSONObject feature = new JSONObject();
            JSONObject properties = new JSONObject();
            JSONObject geometry = new JSONObject();
            JSONArray coordinates = new JSONArray();
            // .set 사용을 위한 공란 추가
            coordinates.add(0);
            coordinates.add(0);

            //feature 틀 생성
            feature.put("type", "Feature");
            feature.put("properties", properties);
            feature.put("geometry", geometry);
            geometry.put("type", "Point");
            geometry.put("coordinates", coordinates);

            //properties 정류소 CSS 정보 데이터 삽입
            properties.put("featureId", NODE_FEATURE_ID);
            properties.put("iconId", NODE_ICON_ID);
            properties.put("label", "");
            properties.put("emptyLabel", "");

            //properties 정류소 속성 정보 데이터 삽입
            for( Map.Entry<String, Object> entry : data.entrySet() ){
                String strKey = entry.getKey();
                String strValue = (String) entry.getValue();
                properties.put(strKey, strValue);

                //geometry 데이터 삽입
                if (strKey.equals("LAT")) {
                    coordinates.set(1, Double.parseDouble(strValue));
                } else if (strKey.equals("LNG")) {
                    coordinates.set(0, Double.parseDouble(strValue));
                }
            }
            features.add(feature);
        }

        return geojson.toJSONString();
    }
}