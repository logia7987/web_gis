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

    private static final String STATION_ICON_COLOR_UNDEFINED = "#828282";
    private static final String STATION_LABEL_COLOR_UNDEFINED = "#646464";
    //시내버스
    private static final String STATION_ICON_COLOR_CITY = "#5050FF";
    private static final String STATION_LABEL_COLOR_CITY = "#0000FF";
    //마을버스
    private static final String STATION_ICON_COLOR_VILLAGE = "#228B22";
    private static final String STATION_LABEL_COLOR_VILLAGE = "#2E8B57";
    //시외버스
    private static final String STATION_ICON_COLOR_INTERCITY = "#EB4646";
    private static final String STATION_LABEL_COLOR_INTERCITY = "#EB0000";
    //공항버스
    private static final String STATION_ICON_COLOR_AIRPORT = "#A0522D";
    private static final String STATION_LABEL_COLOR_AIRPORT = "#8B4513";
    //가상정류소
    private static final String STATION_ICON_COLOR_VIRTUAL = "#941494";
    private static final String STATION_LABEL_COLOR_VIRTUAL = "#800080";
    //2개 이상 혼합
    private static final String STATION_ICON_COLOR_MIX = "#FF9614";
    private static final String STATION_LABEL_COLOR_MIX = "#FF8200";
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

        commandMap.put("sc_NE_LNG", sc_NE_LNG);
        commandMap.put("sc_NE_LAT", sc_NE_LAT);
        commandMap.put("sc_SW_LNG", sc_SW_LNG);
        commandMap.put("sc_SW_LAT", sc_SW_LAT);
        commandMap.put("sc_MODE", sc_MODE);

        if (sc_MODE.equals("S")) {
            // 정류소 정보 호출
            resultMap.put("success", true);
            resultMap.put("data", getGeoJsonStation(bmsService.getStation(commandMap)));
        } else if (sc_MODE.equals("N")) {
            // 노드 정보 호출
            resultMap.put("success", true);
            resultMap.put("data", getGeoJsonNode(bmsService.getNode(commandMap)));
        } else if (sc_MODE.equals("L")) {
            // 링크 정보 호출
            resultMap.put("success", true);
            resultMap.put("data", getGeoJsonLink(bmsService.getLink(commandMap)));
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

                // 소수점 6자리까지 표현하기 위한 DecimalFormat 객체 생성
                DecimalFormat df = new DecimalFormat("#.######");

                // 좌표값을 소수점 6자리까지 포맷팅
                String formattedLng = df.format(lng);
                String formattedLat = df.format(lat);

                // commandMap에 값 설정
                commandMap.put("nodeId", properties.get("nodeId"));
                commandMap.put("lng", lng); // double 형식으로 변환
                commandMap.put("lat", lat); // double 형식으로 변환

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

    public String getGeoJsonLink(List<BmsVo> datas) throws Exception{
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(BmsVo data : datas){
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
            properties.put("linkId", data.getLink_id());
            properties.put("rgtrId", data.getRgtr_id());
            properties.put("regDt", data.getReg_dt());
            properties.put("linkDist", data.getLink_dist());
            properties.put("roadNm", data.getRoad_nm());
            properties.put("bgngNodeId", data.getBgng_node_id());
            properties.put("endNodeId", data.getEnd_node_id());
            properties.put("beginLat", data.getBegin_lat());
            properties.put("beginLng", data.getBegin_lng());
            properties.put("endLat", data.getEnd_lat());
            properties.put("endLng", data.getEnd_lng());

            //링크 lineString 좌표값 받아오기
            HashMap<String, Object> paramMap = new HashMap<>();
            paramMap.put("sc_LINK_ID", data.getLink_id());

            List<BmsVo> coords = bmsService.getLinkPointByLinkId(paramMap);

            for(BmsVo coord : coords){
                List<Double> tmpCoord = new ArrayList<>(Arrays.asList(Double.parseDouble(coord.getLng()), Double.parseDouble(coord.getLat())));
                coordinates.add(tmpCoord);
            }

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public String getGeoJsonStation(List<BmsVo> datas) {
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(BmsVo data : datas){
            JSONObject feature = new JSONObject();
            JSONObject properties = new JSONObject();
            JSONObject geometry = new JSONObject();
            JSONArray coordinates = new JSONArray();

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
            properties.put("iconSize", STATION_ICON_SIZE);
            properties.put("textSize", STATION_LABEL_SIZE);
            properties.put("textOffset", STATION_LABEL_OFFSET);
            properties.put("textOpacity", STATION_LABEL_OPACITY);

            //properties 정류소 속성 정보 데이터 삽입
            properties.put("stationId", data.getStation_id());
            properties.put("stationNm", data.getStation_nm());
            properties.put("linkId", data.getLink_id());
            properties.put("stationUseCd", data.getStation_use_cd());
            properties.put("StationUseNm", data.getStation_use_nm());
            properties.put("trsfStationYn", data.getTrsf_station_yn());
            properties.put("trsfStationNm", data.getTrsf_station_nm());
            properties.put("ctrdYn", data.getCtrd_yn());
            properties.put("ctrdNm", data.getCtrd_nm());
            properties.put("stationNmEng", data.getStation_nm_eng());
            properties.put("arsId", data.getArs_id());
            properties.put("orgCd", data.getOrg_cd());
            properties.put("gisYn", data.getGis_yn());
            properties.put("rgtrId", data.getRgtr_id());
            properties.put("regDt", data.getReg_dt());
            properties.put("mdfrId", data.getMdfr_id());
            properties.put("mdfcnDt", data.getMdfcn_dt());
            properties.put("note", data.getNote());
            properties.put("stdgCd", data.getStdg_cd());
            properties.put("areaCd", data.getArea_cd());
            properties.put("useYn", data.getUse_yn());
            properties.put("stationNmChn", data.getStation_nm_chn());
            properties.put("stationNmJap", data.getStation_nm_jap());
            properties.put("stationNmVnm", data.getStation_nm_vnm());
            properties.put("lat", Double.parseDouble(data.getLat()));
            properties.put("lng", Double.parseDouble(data.getLng()));

            properties.put("bitInstlYn", data.getBit_instl_yn());
            properties.put("bitPrYn", data.getBit_pr_yn());
            properties.put("stationTypeCd", data.getStation_type_cd());
            properties.put("bitTypeCd01", data.getBit_type_cd_01());
            properties.put("bitTypeCd02", data.getBit_type_cd_02());
            properties.put("bitTypeCd03", data.getBit_type_cd_03());
            properties.put("bitTypeCd04", data.getBit_type_cd_04());
            properties.put("bitTypeCd05", data.getBit_type_cd_05());
            properties.put("bitTypeCd06", data.getBit_type_cd_06());

            properties.put("lotNumAddr", data.getLot_num_addr());
            properties.put("rideTnsCnt", data.getRide_tns_cnt());
            properties.put("alightCnt", data.getAlight_cnt());

            //geometry 데이터 삽입
            coordinates.add(Double.parseDouble(data.getLng()));
            coordinates.add(Double.parseDouble(data.getLat()));

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public String getGeoJsonNode(List<BmsVo> datas){
        JSONObject geojson = new JSONObject();
        JSONArray features = new JSONArray();

        geojson.put("type", "FeatureCollection");
        geojson.put("features", features);

        for(BmsVo data : datas){
            JSONObject feature = new JSONObject();
            JSONObject properties = new JSONObject();
            JSONObject geometry = new JSONObject();
            JSONArray coordinates = new JSONArray();

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
            properties.put("nodeId", data.getNode_id());
            properties.put("crossroadNm", data.getCrossroad_nm());
            properties.put("areaCd", data.getArea_cd());
            properties.put("lat", Double.parseDouble(data.getLat()));
            properties.put("lng", Double.parseDouble(data.getLng()));


            //geometry 데이터 삽입
            coordinates.add(Double.parseDouble(data.getLng()));
            coordinates.add(Double.parseDouble(data.getLat()));

            features.add(feature);
        }

        return geojson.toJSONString();
    }
}