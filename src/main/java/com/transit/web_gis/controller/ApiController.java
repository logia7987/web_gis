package com.transit.web_gis.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.transit.web_gis.service.*;
import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.GeometryVo;
import com.transit.web_gis.vo.ShpVo;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.geotools.api.data.FileDataStoreFactorySpi;
import org.geotools.api.data.SimpleFeatureStore;
import org.geotools.api.data.Transaction;
import org.geotools.api.feature.simple.SimpleFeature;
import org.geotools.api.feature.simple.SimpleFeatureType;
import org.geotools.api.feature.type.AttributeDescriptor;
import org.geotools.api.referencing.operation.TransformException;
import org.geotools.data.DataUtilities;
import org.geotools.data.DefaultTransaction;
import org.geotools.data.collection.ListFeatureCollection;
import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.shapefile.ShapefileDataStoreFactory;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.geotools.api.referencing.FactoryException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Clob;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;


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

    private static final String POLYGON_ICON_ID = "polygon-icon";
    private static final String POLYGON_FEATURE_ID = "polygon-feature";

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

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final ObjectMapper objectMapper = new ObjectMapper();

    // 테스트 경로
    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");
    private static final File geoDir = new File("C:\\mapbox\\geoJson");

    // 리눅스 경로
//    private static final File tempDir = new File("/app/shapefile_temp");
//    private static final File geoDir = new File("/app/geoJson");

    @GetMapping("/node")
    public void voidTest() {
        System.out.println(bmsService.getNGGNode());
    }

    @PostMapping(value = "/uploadShapeFiles", consumes = "multipart/form-data", produces = "application/json; charset=UTF-8")
    @ResponseBody
    public Map<String, Object> uploadShapeFiles(@RequestParam("shpData") List<MultipartFile> files, HttpSession session) throws IOException, ParseException {
        Map<String, Object> result = new HashMap<>();

        try {
            prepareDirectories();
            uploadFiles(files);

            File shpFile = shapeService.findFile(tempDir, ".shp");
            if (shpFile == null) {
                result.put("error", "SHP 파일을 찾을 수 없습니다.");
                return result;
            }

            handleShpFile(shpFile, result, session);

        } catch (IOException e) {
            e.printStackTrace();
            result.put("error", "파일 처리 중 오류 발생: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "예기치 않은 오류 발생: " + e.getMessage());
        }

        return result;
    }

    private void prepareDirectories() throws IOException {
        FileUtils.forceMkdir(tempDir);
        FileUtils.forceMkdir(geoDir);
    }

    private void uploadFiles(List<MultipartFile> files) throws IOException {
        for (MultipartFile aFile : files) {
            Path filePath = new File(tempDir, Objects.requireNonNull(aFile.getOriginalFilename())).toPath();
            Files.copy(aFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void handleShpFile(File shpFile, Map<String, Object> result, HttpSession session) {
        try {
            String crs = handlePrjFileOrDefault();
            result.put("crs", crs);

            CompletableFuture<String> jsonResultFuture = convertShpToGeoJSONAsync(shpFile);
            String jsonResult = jsonResultFuture.join();

            JSONObject jsonObj = parseJson(jsonResult);
            saveJsonToFile(shpFile, jsonObj);
            updateSessionAttributes(session, shpFile);

        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", "Shp to GeoJSON 변환 중 오류 발생: " + e.getMessage());
        }
    }

    private String handlePrjFileOrDefault() throws IOException, FactoryException {
        File prjFile = shapeService.findFile(tempDir, ".prj");
        if (prjFile != null) {
            return String.valueOf(shapeService.extractCRS(prjFile));
        } else {
            // 기본 좌표계 (WGS84)로 설정
            return "EPSG:4326";
        }
    }

    private CompletableFuture<String> convertShpToGeoJSONAsync(File shpFile) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return shapeService.convertShpToGeoJSON(shpFile, tempDir);
            } catch (IOException | FactoryException e) {
                throw new RuntimeException(e);
            } catch (TransformException e) {
                throw new RuntimeException(e);
            }
        });
    }

    private JSONObject parseJson(String jsonResult) throws ParseException {
        JSONParser jsonParser = new JSONParser();
        return (JSONObject) jsonParser.parse(jsonResult);
    }

    private void saveJsonToFile(File shpFile, JSONObject jsonObj) throws IOException {
        File jsonFile = new File(geoDir, shpFile.getName().replace(".shp", "") + ".json");
        try (FileWriter fileWriter = new FileWriter(jsonFile)) {
            fileWriter.write(jsonObj.toJSONString());
        }
    }

    private void updateSessionAttributes(HttpSession session, File shpFile) {
        session.setAttribute("jsonFilePath", new File(geoDir, shpFile.getName().replace(".shp", "") + ".json").getAbsolutePath());
        session.setAttribute("fileName", shpFile.getName().replace(".shp", ""));
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
        String fileName = (String) params.get("fileName");

        commandMap.put("sc_NE_LNG", sc_NE_LNG);
        commandMap.put("sc_NE_LAT", sc_NE_LAT);
        commandMap.put("sc_SW_LNG", sc_SW_LNG);
        commandMap.put("sc_SW_LAT", sc_SW_LAT);
        commandMap.put("fileName", fileName);

        String sc_MODE = (String) shapeService.checkShpType(commandMap).get("SHP_TYPE");
        commandMap.put("sc_MODE", sc_MODE);

        switch (sc_MODE) {
            case "node" :
                resultMap.put(fileName + "_data", getGeoJsonNode(shapeService.getNodeShpData(commandMap)));
                break;
            case "link" :
                resultMap.put(fileName + "_data", getGeoJsonLink(shapeService.getLinkShpData(commandMap)));
                break;
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value="/getPolygonData", method=RequestMethod.POST)
    public HashMap<String, Object> getPolygonData(@RequestBody Map<String, Object> params) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();
        HashMap<String, Object> commandMap = new HashMap<>();

        String fileName = (String) params.get("fileName");

        commandMap.put("fileName", fileName);

        resultMap.put(fileName + "_data", getGeoJsonPolygon(shapeService.getPolygonShpData(commandMap)));

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value="/updateGeometry.do", method=RequestMethod.POST)
    public HashMap<String, Object> updateGeometry(@RequestBody Map<String, Object> params) throws JsonProcessingException {
        HashMap<String, Object> resultMap = new HashMap<>();
        HashMap<String, Object> commandMap = new HashMap<>();

        ObjectMapper objectMapper = new ObjectMapper();

        String type = (String) params.get("type");
        Map<String, Object> feature = (Map<String, Object>) params.get("feature");

        String fileName = (String) ((Map<String, Object>) feature.get("properties")).get("FILE_NAME");
        String fileFeatureId = (String) ((Map<String, Object>) feature.get("properties")).get(fileName+"_ID");

        commandMap.put("fileName", fileName);
        commandMap.put("fileFeatureId", fileFeatureId);

        Map<String, Object> properties = (Map<String, Object>) feature.get("properties");
        switch (type) {
            case "node":
                List<Double> geometryNode = (List<Double>) ((Map<String, Object>) feature.get("geometry")).get("coordinates");
                // 좌표값 추출
                Double lng = geometryNode.get(0);
                Double lat = geometryNode.get(1);

                // commandMap에 값 설정
                commandMap.put("lng", lng);
                commandMap.put("lat", lat);

                if (shapeService.updateNodeStationShpData(commandMap) > 0) {
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

                commandMap.put("lng", lng); // double 형식으로 변환
                commandMap.put("lat", lat); // double 형식으로 변환

                if (shapeService.updateNodeStationShpData(commandMap) > 0) {
                    resultMap.put("result", "success");
                } else {
                    resultMap.put("result", "fail");
                }
                break;
            case "link":
                String geometryJson = objectMapper.writeValueAsString(feature.get("geometry"));
                commandMap.put("geometry", geometryJson);
                if (shapeService.updateLinkShpData(commandMap) > 0) {
                    // 성공처리
                    resultMap.put("result", "success");
                } else {
                    // 실패처리 2
                    resultMap.put("result", "fail");
                }
                break;
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value="/uploadShpTable", method=RequestMethod.POST)
    public Map<String, Object> saveShpFileTable(@RequestParam("fileName") String tableName,
                                                @RequestParam("idxArr") String idxArr,
                                                @RequestParam("isAllChecked") boolean isAllChecked,
                                                @RequestParam("shpType") String shpType,
                                                @RequestParam("label") String label,
                                                @RequestParam("confirmFlag") boolean confirmFlag) {

        Map<String, Object> commandMap = new HashMap<>();
        Map<String, Object> resultMap = new HashMap<>();

        commandMap.put("fileName", tableName);
        int hasShp = shapeService.checkHasShpFile(commandMap);

        if (hasShp > 0 && !confirmFlag) {
            resultMap.put("message", tableName + " 파일이 이미 존재합니다.");
            return resultMap;
        } else {
            if (confirmFlag && hasShp > 0) {
                shapeService.dropShpTable(commandMap);
                resultMap = shapeService.saveSelectedFeatures(tableName, idxArr, isAllChecked, shpType, label);
            } else {
                return shapeService.saveSelectedFeatures(tableName, idxArr, isAllChecked, shpType, label);
            }
        }
        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value = "/insertShpTable", method = RequestMethod.POST)
    public Map<String, Object> insertShpFileTable(@RequestBody Map<String, Object> params) {
        // 파라미터에서 properties와 geometry 추출
        Map<String, Object> properties = (Map<String, Object>) params.get("properties");

        // 파일 이름 추출
        String fileName = (String) properties.get("FILE_NAME");
        String idColumn = fileName + "_ID";

        // 테이블에서 현재 최대 ID 조회
        String maxIdQuery = String.format("SELECT COALESCE(MAX(%s), 0) FROM TRANSIT.%s", idColumn, fileName);
        Integer maxId = jdbcTemplate.queryForObject(maxIdQuery, Integer.class);
        int newId = (maxId == null ? 0 : maxId) + 1; // 새로운 ID는 최대 ID + 1

        // SQL 쿼리 동적 생성
        StringJoiner columns = new StringJoiner(", ");
        StringJoiner values = new StringJoiner(", ");

        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String key = entry.getKey();
            if (!key.equals(idColumn)) { // 이미 ID 열이 properties에 있다면 제외
                columns.add("\""+entry.getKey() +"\"");
                Object value = entry.getValue();

                if (entry.getKey().equals("GEOMETRY")) {
                    // Convert the GEOMETRY value to JSON string
                    try {
                        String jsonValue = objectMapper.writeValueAsString(value);
                        values.add("'" + jsonValue + "'");
                    } catch (Exception e) {
                        // Handle exception
                        e.printStackTrace();
                    }
                } else {
                    if (value instanceof String) {
                        values.add("'" + value + "'");
                    } else if (value instanceof Number) {
                        values.add(value.toString());
                    } else {
                        values.add("'" + value.toString() + "'");
                    }
                }
            }
        }

        columns.add("\"" + idColumn + "\"");
        values.add(Integer.toString(newId));

        String sql = String.format(
                "INSERT INTO TRANSIT.%s (%s) VALUES (%s)",
                fileName,
                columns,
                values
        );

        // SQL 실행
        jdbcTemplate.update(sql);

        return Map.of("status", "success");
    }

    @ResponseBody
    @RequestMapping(value = "/getShpProperties", method = RequestMethod.POST)
    public Map<String, Object> getShpProperties(@RequestParam("fileName") String fileName) {
        Map<String, Object> resultMap = new HashMap<>();
        Map<String, Object> commandMap = new HashMap<>();
        commandMap.put("fileName", fileName);

        List<String> columnNames = shapeService.getShpColumnNames(fileName);
        Map<String, Object> labelColumn = shapeService.getDefaultLabel(fileName);
        String shpType = (String) shapeService.checkShpType(commandMap).get("SHP_TYPE");
        resultMap.put("columnNames", columnNames);
        resultMap.put("labelColumn", labelColumn);
        resultMap.put("shpType", shpType);
        return resultMap;
    }

    @ResponseBody
//    @RequestMapping(value = "/getShpStyle", method = RequestMethod.POST)
    public Map<String, Object> getShpStyle(@RequestParam("fileName") String fileName) {
        Map<String, Object> resultMap = new HashMap<>();
        Map<String, Object> commandMap = new HashMap<>();
        commandMap.put("fileName", fileName);
        String shpType = (String) shapeService.checkShpType(commandMap).get("SHP_TYPE");

        Map<String, Object> color = shapeService.getDefaultColor(fileName);
        Map<String, Object> weight = shapeService.getDefaultWeight(fileName);
        Map<String, Object> fontColor = shapeService.getDefaultFontColor(fileName);
        Map<String, Object> fontSize = shapeService.getDefaultFontSize(fileName);
        resultMap.put("color", color);
        resultMap.put("weight", weight);
        resultMap.put("fontColor", fontColor);
        resultMap.put("fontSize", fontSize);
        resultMap.put("shpType", shpType);
        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value = "/updateLabel", method = RequestMethod.POST)
    public Map<String, Object> updateLabel(@RequestParam("fileName") String fileName,
                                           @RequestParam("labelColumn") String labelColumn) {
        Map<String, Object> resultMap = new HashMap<>();
        Map<String, Object> commandMap = new HashMap<>();

        commandMap.put("fileName", fileName);
        commandMap.put("labelColumn", labelColumn);

        if (shapeService.updateLabel(commandMap) > 0) {
            resultMap.put("result", "success");
        } else {
            resultMap.put("result", "fail");
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value = "/deleteShpFeatureData", method = RequestMethod.POST)
    public Map<String, Object> deleteShpFeatureData(@RequestParam("fileName") String fileName,
                                           @RequestParam("featureId") String featureId) {
        Map<String, Object> resultMap = new HashMap<>();
        Map<String, Object> commandMap = new HashMap<>();

        commandMap.put("fileName", fileName);
        commandMap.put("featureId", featureId);

        if (shapeService.deleteShpFeatureData(commandMap) > 0) {
            resultMap.put("result", "success");
        } else {
            resultMap.put("result", "fail");
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value = "/updateProperties", method = RequestMethod.POST)
    public Map<String, Object> updateProperties(@RequestBody Map<String, Object> params) {
        Map<String, Object> resultMap = new HashMap<>();

        String fileName = (String) params.get("FILE_NAME");
        String featureId = (String) params.get(fileName + "_ID");

        params.remove("FILE_NAME");
        params.remove(fileName + "_ID");

        Map<String, Object> properties = new HashMap<>(params);

        Map<String, Object> paramMap = new HashMap<>();
        paramMap.put("FILE_NAME", fileName);
        paramMap.put("featureId", featureId);
        paramMap.put("properties", properties);

        if (shapeService.updateProperties(paramMap) > 0) {
            resultMap.put("result", "success");
        } else {
            resultMap.put("result", "fail");
        }

        return resultMap;
    }

    @ResponseBody
    @RequestMapping(value = "/saveSplitLine", method = RequestMethod.POST)
    public Map<String, Object> saveSplitLine(@RequestBody Map<String, Object> params) throws JsonProcessingException {
        Map<String, Object> resultMap = new HashMap<>();

        List<Map<String, Object>> feature = (List<Map<String, Object>>) params.get("feature");

        for (int i = 0; i < feature.size(); i++) {
            Map<String, Object> aFeature = feature.get(i);

            Map<String, Object> properties = (Map<String, Object>) aFeature.get("properties");

            String fileName = (String) properties.get("FILE_NAME");
            String idColumn = fileName + "_ID";
            String featureId = (String) properties.get(idColumn);

            // 테이블에서 현재 최대 ID 조회
            String maxIdQuery = String.format("SELECT COALESCE(MAX(%s), 0) FROM TRANSIT.%s", idColumn, fileName);
            Integer maxId = jdbcTemplate.queryForObject(maxIdQuery, Integer.class);
            int newId = (maxId == null ? 0 : maxId) + 1; // 새로운 ID는 최대 ID + 1

            String sql = String.format(
                    "DELETE FROM TRANSIT.%s WHERE %s = %s",
                    fileName,
                    idColumn,
                    featureId
            );

            jdbcTemplate.update(sql);

            if (properties.containsKey("DELETE_ID")) {
                sql = String.format(
                        "DELETE FROM TRANSIT.%s WHERE %s = %s",
                        fileName,
                        idColumn,
                        properties.get("DELETE_ID")
                );

                jdbcTemplate.update(sql);
            }

            // MultiLineString 처리
            Object geometryObj = aFeature.get("geometry");

            if (geometryObj instanceof Map) {
                Map<String, Object> geometry = (Map<String, Object>) geometryObj;
                String type = (String) geometry.get("type");

                if ("MultiLineString".equals(type)) {
                    List<List<List<Double>>> coordinatesList = (List<List<List<Double>>>) geometry.get("coordinates");

                    for (List<List<Double>> coordinates : coordinatesList) {
                        // 각 LineString을 새로운 로우로 삽입
                        insertLineString(fileName, idColumn, newId, properties, coordinates);
                        newId++; // 새로운 ID 생성
                    }
                    resultMap.put("result", "success");
                } else if ("LineString".equals(type)) {
                    List<List<Double>> coordinates = (List<List<Double>>) geometry.get("coordinates");

                    insertLineString(fileName, idColumn, newId, properties, coordinates);
                    resultMap.put("result", "success");
                } else {
                    // 처리할 수 없는 형식 처리
                    throw new IllegalArgumentException("Unsupported geometry type: " + type);
                }
            } else {
                // 처리할 수 없는 형식 처리
                throw new IllegalArgumentException("Unsupported geometry format");
            }
        }

        return resultMap;
    }

    private void insertLineString(String fileName, String idColumn, int newId, Map<String, Object> properties, List<List<Double>> coordinates) throws JsonProcessingException {
        // SQL 쿼리 동적 생성
        StringJoiner columns = new StringJoiner(", ");
        StringJoiner values = new StringJoiner(", ");

        Map<String, Object> lineStringGeometry = new HashMap<>();
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String key = entry.getKey();
            if (key.equals("featureId") || key.equals("emptyLabel") || key.equals("label") || key.equals(idColumn) || key.equals("DELETE_ID")) {
                continue;
            }

            columns.add("\"" + key + "\"");
            Object value = entry.getValue();

            if (key.equals("F_LNG")) {
                entry.setValue(coordinates.get(0).get(0));
            } else if (key.equals("F_LAT")) {
                entry.setValue(coordinates.get(0).get(1));
            } else if (key.equals("T_LNG")) {
                entry.setValue(coordinates.get(coordinates.size()-1).get(0));
            } else if (key.equals("T_LAT")) {
                entry.setValue(coordinates.get(coordinates.size()-1).get(1));
            }

            if (value instanceof String) {
                values.add("'" + value + "'");
            } else if (value instanceof Number) {
                values.add(value.toString());
            } else {
                values.add("'" + value.toString() + "'");
            }
        }

        lineStringGeometry.put("type", "LineString");
        lineStringGeometry.put("coordinates", coordinates);

        String jsonValue = objectMapper.writeValueAsString(lineStringGeometry);

        columns.add("GEOMETRY");
        values.add("'" + jsonValue + "'");

        columns.add("\"" + idColumn + "\"");
        values.add(Integer.toString(newId));

        String insertSql = String.format(
                "INSERT INTO TRANSIT.%s (%s) VALUES (%s)",
                fileName,
                columns,
                values
        );

        jdbcTemplate.update(insertSql);
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
            geometry.put("type", "");
            geometry.put("coordinates", coordinates);

            //properties 정류소 CSS 정보 데이터 삽입
            properties.put("featureId", LINK_FEATURE_ID);
            properties.put("label", "");
            properties.put("emptyLabel", "");

            //properties 정류소 속성 정보 데이터 삽입
            for( Map.Entry<String, Object> entry : data.entrySet() ){
                String strKey = entry.getKey();
                Object value = entry.getValue();

                if (strKey.equals("GEOMETRY")) {
                    String geometryString = clobToString((Clob) entry.getValue());

                    JSONArray coordArray = (JSONArray) ((JSONObject) new JSONParser().parse(geometryString)).get("coordinates");

                    String geoDataType = (String) ((JSONObject) new JSONParser().parse(geometryString)).get("type");
                    if (geometry.get("type").equals("")) {
                        geometry.put("type", geoDataType);
                    }

                    geometry.put("coordinates", coordArray);
                } else {
                    if (value == null) {
                        properties.put(strKey, "");  // null일 경우 빈 문자열 추가
                    } else if (value instanceof Number) {
                        properties.put(strKey, value.toString());
                    } else if (value instanceof String) {
                        properties.put(strKey, (String) value);
                    } else if (value instanceof Boolean) {
                        properties.put(strKey, value.toString());
                    } else if (value instanceof Date) {
                        // 날짜 형식 처리
                        properties.put(strKey, new SimpleDateFormat("yyyy-MM-dd").format(value));
                    } else {
                        properties.put(strKey, value.toString());  // 기타 타입 처리
                    }
                }
            }

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public String getGeoJsonPolygon(List<Map<String, Object>> datas) throws Exception{
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
            geometry.put("type", "");
            geometry.put("coordinates", coordinates);

            //properties 정류소 CSS 정보 데이터 삽입
            properties.put("featureId", POLYGON_FEATURE_ID);
            properties.put("label", "");
            properties.put("emptyLabel", "");

            //properties 정류소 속성 정보 데이터 삽입
            for( Map.Entry<String, Object> entry : data.entrySet() ){
                String strKey = entry.getKey();
                Object value = entry.getValue();

                if (strKey.equals("GEOMETRY")) {
                    String geometryString = clobToString((Clob) entry.getValue());

                    JSONArray coordArray = (JSONArray) ((JSONObject) new JSONParser().parse(geometryString)).get("coordinates");

                    String geoDataType = (String) ((JSONObject) new JSONParser().parse(geometryString)).get("type");
                    if (geometry.get("type").equals("")) {
                        geometry.put("type", geoDataType);
                    }

                    geometry.put("coordinates", coordArray);
                } else {
                    if (value instanceof Number) {
                        properties.put(strKey, value.toString());
                    } else if (value instanceof String) {
                        properties.put(strKey, (String) value);
                    }
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
                Object value = entry.getValue();
                // null 값 처리
                if (value == null || value == "") {
                    properties.put(strKey, ""); // null일 경우 빈 문자열 추가
                } else if (value instanceof Number || value instanceof String) {
                    properties.put(strKey, value.toString());
                } else if (value instanceof Boolean) {
                    properties.put(strKey, value.toString());
                } else if (value instanceof Date) {
                    // 날짜 형식 처리
                    properties.put(strKey, new SimpleDateFormat("yyyy-MM-dd").format(value));
                } else {
                    properties.put(strKey, value.toString()); // 기타 타입 처리
                }

                //geometry 데이터 삽입
                if (strKey.equals("LAT")) {
                    coordinates.set(1, Double.parseDouble((String) value));
                } else if (strKey.equals("LNG")) {
                    coordinates.set(0, Double.parseDouble((String) value));
                }
            }
            features.add(feature);
        }

        return geojson.toJSONString();
    }

    private String clobToString(Clob clob) throws Exception {
        StringBuilder sb = new StringBuilder();
        Reader reader = clob.getCharacterStream();
        BufferedReader br = new BufferedReader(reader);
        String line;
        while (null != (line = br.readLine())) {
            sb.append(line);
        }
        br.close();
        return sb.toString();
    }

    @ResponseBody
    @RequestMapping(value="/searchObject", method=RequestMethod.POST, consumes = "application/json")
    public Map<String, Object> searchObject(@RequestBody Map<String, String> params) throws Exception {
        String table = params.get("table");
        String column = params.get("column");
        String keyword = params.get("keyword");

        Map<String, Object> result = new HashMap<>();
        //System.out.println(shapeService.selectObject(table, column, keyword));
        result.put("data", shapeService.selectObject(table, column, keyword));
        return result;
    }

    @GetMapping("/downloadShp")
    private ResponseEntity<InputStreamResource> convertToShpFile(@RequestParam("tableName") String tableName) throws Exception {

        System.out.println("요청받은 테이블 이름: " + tableName);

        String geoJsonStr = "";
        Map<String, Object> commandMap = new HashMap<>();
        commandMap.put("fileName", tableName);

        // SHP 타입 확인
        String shpType = (String) shapeService.checkShpType(commandMap).get("SHP_TYPE");
        System.out.println("확인된 SHP 타입: " + shpType);

        if (shpType.equals("node")) {
            System.out.println("노드 데이터로 판별.");
            geoJsonStr = getGeoJsonNode(shapeService.getTableData(commandMap));
            System.out.println("노드 데이터에 대한 GeoJSON 생성 완료.");
        } else {
            System.out.println("링크 데이터로 판별.");
            geoJsonStr = getGeoJsonLink(shapeService.getTableData(commandMap));
            System.out.println("링크 데이터에 대한 GeoJSON 생성 완료.");
        }

        // 2. GeoJSON -> SimpleFeatureCollection 변환
        FeatureJSON featureJSON = new FeatureJSON();
        SimpleFeatureCollection featureCollection = (SimpleFeatureCollection) featureJSON.readFeatureCollection(new StringReader(geoJsonStr));

        SimpleFeatureType originalFeatureType = featureCollection.getSchema();
        SimpleFeatureTypeBuilder builder = new SimpleFeatureTypeBuilder();
        builder.init(originalFeatureType);
        builder.setCRS(DefaultGeographicCRS.WGS84); // 좌표계를 EPSG:4326으로 설정
        SimpleFeatureType featureTypeWithCRS = builder.buildFeatureType();


        // 새로운 좌표계를 갖는 SimpleFeatureCollection 생성
        List<SimpleFeature> reprojectedFeatures = new ArrayList<>();
        SimpleFeatureBuilder featureBuilder = new SimpleFeatureBuilder(featureTypeWithCRS);
        try (SimpleFeatureIterator iterator = featureCollection.features()) {
            while (iterator.hasNext()) {
                SimpleFeature feature = iterator.next();
                featureBuilder.addAll(feature.getAttributes());
                reprojectedFeatures.add(featureBuilder.buildFeature(feature.getID()));
            }
        }
        featureCollection = new ListFeatureCollection(featureTypeWithCRS, reprojectedFeatures);

        // 3. SHP 파일들 생성 로직 (이미 구현된 GeoTools 활용)
        File shpFile = new File(tempDir + tableName + ".shp");
        System.out.println("SHP 파일 생성 시작: " + shpFile.getAbsolutePath());

        createShapefile(featureCollection, shpFile);
        System.out.println("SHP 파일 생성 완료: " + shpFile.getAbsolutePath());

        // 4. Zip 파일 생성
        File zipFile = new File(tempDir + tableName + ".zip");
        System.out.println("Zip 파일 생성 시작: " + zipFile.getAbsolutePath());

        try (FileOutputStream fos = new FileOutputStream(zipFile);
             ZipOutputStream zipOut = new ZipOutputStream(fos)) {

            File shxFile = new File(tempDir + tableName + ".shx");
            File dbfFile = new File(tempDir + tableName + ".dbf");

            addFileToZip(shpFile, zipOut);
            addFileToZip(shxFile, zipOut);
            addFileToZip(dbfFile, zipOut);

            System.out.println("SHP, SHX, DBF 파일을 Zip에 추가 완료.");
        }

        // 5. HTTP 응답으로 zip 파일 전송
        InputStreamResource resource = new InputStreamResource(new FileInputStream(zipFile));
        System.out.println("HTTP 응답으로 Zip 파일 전송 준비 완료.");

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + tableName + ".zip");

        System.out.println("응답 전송 준비 완료: " + tableName + ".zip");

        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(zipFile.length())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }


    private void createShapefile(SimpleFeatureCollection featureCollection, File shpFile) throws IOException {
        // Shapefile 생성 로직
        Map<String, Serializable> params = new HashMap<>();
        params.put("url", shpFile.toURI().toURL());

        ShapefileDataStoreFactory dataStoreFactory = new ShapefileDataStoreFactory();
        ShapefileDataStore newDataStore = (ShapefileDataStore) dataStoreFactory.createNewDataStore(params);

        newDataStore.setCharset(StandardCharsets.UTF_8);
        SimpleFeatureType featureType = featureCollection.getSchema();
        newDataStore.createSchema(featureType);

        try (Transaction transaction = new DefaultTransaction("create")) {
            SimpleFeatureStore featureStore = (SimpleFeatureStore) newDataStore.getFeatureSource(newDataStore.getTypeNames()[0]);
            featureStore.setTransaction(transaction);
            featureStore.addFeatures(featureCollection);
            transaction.commit();
        } catch (Exception e) {
            e.printStackTrace();
            throw new IOException("Shapefile 생성 중 오류가 발생했습니다.", e);
        } finally {
            newDataStore.dispose();
        }
    }

    private void addFileToZip(File file, ZipOutputStream zipOut) throws IOException {
        try (FileInputStream fis = new FileInputStream(file)) {
            ZipEntry zipEntry = new ZipEntry(file.getName());
            zipOut.putNextEntry(zipEntry);
            byte[] bytes = new byte[1024];
            int length;
            while ((length = fis.read(bytes)) >= 0) {
                zipOut.write(bytes, 0, length);
            }
        }
    }
}