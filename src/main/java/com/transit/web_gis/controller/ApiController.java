package com.transit.web_gis.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.transit.web_gis.service.FeatureService;
import com.transit.web_gis.service.GeometryService;
import com.transit.web_gis.service.ShapeService;
import com.transit.web_gis.service.ShpService;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Controller
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private ShpService shpService;

    @Autowired
    private FeatureService featureService;

    @Autowired
    private GeometryService geometryService;

    @Autowired
    private ShapeService shapeService;

    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");

    @PostMapping(value = "/uploadShapeFiles", consumes = "multipart/form-data", produces = "application/json; charset=UTF-8")
    @ResponseBody
    public Map<String, Object> uploadShapeFiles(@RequestParam("shpData") List<MultipartFile> files, HttpSession session) throws IOException, ParseException {
        Map<String, Object> result = new HashMap<>();

        try {
            FileUtils.forceMkdir(tempDir);
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
                    File jsonFile = new File(tempDir, "data.json");
                    try (FileWriter fileWriter = new FileWriter(jsonFile)) {
                        fileWriter.write(jsonObj.toJSONString());
                    }

                    // 파일 경로를 세션에 저장
                    session.setAttribute("jsonFilePath", jsonFile.getAbsolutePath());
                    // dataArr 에서 구분자로 사용할 파일명
                    session.setAttribute("fileName", shpFile.getName().replace(".shp", ""));
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

    @RequestMapping(value="/getData.do", method=RequestMethod.POST)
    @ResponseBody
    public Map<String, Object> getData(){

        return null;
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
}
