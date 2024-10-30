package com.transit.web_gis.service;

import com.transit.web_gis.mapper.ShapeMapper;
import com.transit.web_gis.vo.ShpVo;
import org.geotools.api.data.SimpleFeatureSource;
import org.geotools.api.feature.simple.SimpleFeature;
import org.geotools.api.referencing.FactoryException;
import org.geotools.api.referencing.operation.MathTransform;
import org.geotools.api.referencing.operation.TransformException;
import org.geotools.data.DataUtilities;
import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.locationtech.jts.geom.*;
import org.locationtech.proj4j.*;

import org.geotools.api.referencing.crs.CoordinateReferenceSystem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

@Service
public class ShapeService {

    // EPSG:2097 (Korean Transverse Mercator) PROJ 문자열 정의
    private static final String PROJ_KTM = "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";

    // EPSG:4326 (WGS 84) PROJ 문자열 정의
    private static final String PROJ_WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

//     리눅스 경로
//    private static final File tempDir = new File("/app/shapefile_temp");
//    private static final File geoDir = new File("/app/geoJson");
    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");
    private static final File geoDir = new File("C:\\mapbox\\geoJson");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private final ShapeMapper shapeMapper;

    public ShapeService(ShapeMapper shapeMapper) {
        this.shapeMapper = shapeMapper;
    }
    public List<ShpVo> selectShpList() {
        return shapeMapper.selectShpList();
    }
    public List<String> selectObject(String table, String column, String keyword) {
        return shapeMapper.selectObject(table, column, keyword);
    }
    public String getShpType(String fileName) {
        return shapeMapper.getShpType(fileName);
    }
    public List<String> getShpColumnNames(String fileName) {
        return shapeMapper.getShpColumnNames(fileName);
    }
    public Map<String, Object> getDefaultLabel(String fileName) {
        return shapeMapper.getDefaultLabel(fileName);
    }
    public Map<String, Object> getDefaultColor(String fileName) {return shapeMapper.getDefaultColor(fileName);}
    public Map<String, Object> getDefaultWeight(String fileName) {
        return shapeMapper.getDefaultWeight(fileName);
    }
    public Map<String, Object> getDefaultFontColor(String fileName) {return shapeMapper.getDefaultFontColor(fileName);}
    public Map<String, Object> getDefaultFontSize(String fileName) {
        return shapeMapper.getDefaultFontSize(fileName);
    }

    public Map<String, Object> checkShpType(Map<String, Object> commandMap) {
        return shapeMapper.checkShpType(commandMap);
    }
    public List<Map<String, Object>> getTableData(Map<String, Object> commandMap) {
        return shapeMapper.getTableData(commandMap);
    }
    public List<Map<String, Object>> getNodeShpData(Map<String, Object> commandMap) {
        return shapeMapper.getNodeShpData(commandMap);
    }
    public List<Map<String, Object>> getLinkShpData(Map<String, Object> commandMap) {
        return shapeMapper.getLinkShpData(commandMap);
    }
    public List<Map<String, Object>> getPolygonShpData(Map<String, Object> commandMap) {
        return shapeMapper.getPolygonShpData(commandMap);
    }
    public int checkHasShpFile(Map<String, Object> commandMap) {
        return shapeMapper.checkHasShpFile(commandMap);
    }
    public int updateLabel(Map<String, Object> commandMap) {
        return shapeMapper.updateLabel(commandMap);
    }
    public int updateNodeStationShpData(Map<String, Object> commandMap) {
        return shapeMapper.updateNodeStationShpData(commandMap);
    }
    public int deleteShpFeatureData(Map<String, Object> commandMap) {
        return shapeMapper.deleteShpFeatureData(commandMap);
    }
    public int updateLinkShpData(Map<String, Object> commandMap) {
        return shapeMapper.updateLinkShpData(commandMap);
    }
    public int insertShpTable(Map<String, Object> commandMap) {
        return shapeMapper.insertShpTable(commandMap);
    }
    public void dropShpTable(Map<String, Object> commandMap) {
        shapeMapper.dropShpTable(commandMap);
    }
    public int updateProperties(Map<String, Object> commandMap) {
        return shapeMapper.updateProperties(commandMap);
    }


    @Transactional
    public Map<String, Object> saveSelectedFeatures(String tableName, String idxArr, boolean isChecked, String shpType, String label) {
        Map<String, Object> resultMap = new HashMap<>();

        File geoJsonFile = new File(geoDir, tableName + ".json");

        String[] bArr = idxArr.replace("[", "").replace("]","").split(",");

        if (!isTableExists(tableName)) {
            if (geoJsonFile.exists()) {
                try {
                    String createTableSql = createTableSqlFromGeoJson(geoJsonFile, tableName);
                    jdbcTemplate.execute(createTableSql);

                    try (FileReader reader = new FileReader(geoJsonFile)) {
                        // feature 를 DB에 넣는 로직
                        StringBuilder jsonContent = new StringBuilder();
                        int i;
                        while ((i = reader.read()) != -1) {
                            jsonContent.append((char) i);
                        }

                        JSONParser jsonParser = new JSONParser();
                        JSONObject geoJson = (JSONObject) jsonParser.parse(jsonContent.toString());
                        JSONArray features = (JSONArray) geoJson.get("features");
                        String typeString = checkFeatureType((JSONObject) ((JSONObject)features.get(0)).get("geometry"));
                        if (typeString.equals("Link")) {
                            System.out.println("링크 타입");
                            if (isChecked) {
                                // 전체 선택 - 모든 Feature 를 저장한다.
                                System.out.println("전체 입력 수행 중");
                                saveLink(tableName, features, shpType, null, label);
                                System.out.println("전체 입력 수행 완료");
                            } else {
                                // 일부 선택 - 전달받은 index 를 추출하여 저장한다.
                                saveLink(tableName, features, shpType, bArr, label);
                            }
                            
                        } else if (typeString.equals("Point")) {
                            System.out.println("포인트 타입");
                            if (isChecked) {
                                // 전체 선택 - 모든 Feature 를 저장한다.
                                System.out.println("전체 입력 수행 중");
                                saveNode(tableName, features, shpType, null, label);
                                System.out.println("전체 입력 수행 완료");
                            } else {
                                // 일부 선택 - 전달받은 index 를 추출하여 저장한다.
                                saveNode(tableName, features, shpType, bArr, label);
                            }
                        } else {
                            System.out.println("폴리곤 타입");
                            if (isChecked) {
                                // 전체 선택 - 모든 Feature 를 저장한다.
                                System.out.println("전체 입력 수행 중");
                                savePolygon(tableName, features, shpType, null, label);
                                System.out.println("전체 입력 수행 완료");
                            } else {
                                // 일부 선택 - 전달받은 index 를 추출하여 저장한다.
                                savePolygon(tableName, features, shpType, bArr, label);
                            }
                        }
                    } catch (ParseException e) {
                        throw new RuntimeException(e);
                    }

                    resultMap.put("result", "success");
                    resultMap.put("message", "ShapeFile 이 정상적으로 저장되었습니다.");
                } catch (IOException e) {
                    e.printStackTrace();
                    resultMap.put("result", "error");
                    resultMap.put("message", "ShapeFile 을 읽는데 에러가 발생했습니다.");
                }
            }
        }

        return resultMap;
    }

    // ShapeFile 명으로 Table 을 정의하는 함수
    private String createTableSqlFromGeoJson(File geoJsonFile, String tableName) throws IOException {
        StringBuilder createTableSql = new StringBuilder("CREATE TABLE " + tableName + " (");

        try (FileReader reader = new FileReader(geoJsonFile)) {
            StringBuilder jsonContent = new StringBuilder();
            int i;
            while ((i = reader.read()) != -1) {
                jsonContent.append((char) i);
            }

            JSONParser jsonParser = new JSONParser();
            JSONObject geoJson = (JSONObject) jsonParser.parse(jsonContent.toString());
            JSONArray features = (JSONArray) geoJson.get("features");

            if (!features.isEmpty()) {
                JSONObject firstFeature = (JSONObject) features.get(0);
                JSONObject properties = (JSONObject) firstFeature.get("properties");

                boolean firstColumn = true;
                for (Object key : properties.keySet()) {
                    if (!firstColumn) {
                        createTableSql.append(", ");
                    }
                    createTableSql.append("\""+key+"\"").append(" VARCHAR2(255)");
                    firstColumn = false;
                }

                // 편집모드 선택을 위한 객체 ID 부여
                createTableSql.append(", \"").append(tableName + "_ID\" NUMBER");

                // 분류를 위한 공통 컬럼
                createTableSql.append(", \"FILE_NAME\" VARCHAR2(100)");
                createTableSql.append(", \"SHP_TYPE\" VARCHAR2(100)");
                createTableSql.append(", \"LABEL_COLUMN\" VARCHAR2(100)");
                // Feature 디자인 컬럼
                createTableSql.append(", \"WEIGHT\" VARCHAR2(100)");
                createTableSql.append(", \"COLOR\" VARCHAR2(100)");
                createTableSql.append(", \"FONT_SIZE\" VARCHAR2(100)");
                createTableSql.append(", \"FONT_COLOR\" VARCHAR2(100)");

                JSONObject geometry = (JSONObject) firstFeature.get("geometry");
                String typeString = checkFeatureType(geometry);
                if (typeString.equals("Link")) {
                    createTableSql.append(", \"GEOMETRY\" CLOB");
                    createTableSql.append(", \"F_LNG\" VARCHAR2(100)");
                    createTableSql.append(", \"F_LAT\" VARCHAR2(100)");
                    createTableSql.append(", \"T_LNG\" VARCHAR2(100)");
                    createTableSql.append(", \"T_LAT\" VARCHAR2(100)");
                } else if (typeString.equals("Point")) {
                    createTableSql.append(", \"LNG\" VARCHAR2(100)");
                    createTableSql.append(", \"LAT\" VARCHAR2(100)");
                } else if (typeString.equals("Polygon")) {
                    createTableSql.append(", \"GEOMETRY\" CLOB");
                }
            }

            createTableSql.append(") TABLESPACE GBMS_TS");
        } catch (ParseException e) {
            throw new RuntimeException(e);
        }

        return createTableSql.toString();
    }

    private void saveNode(String tableName, List<JSONObject> features, String shpType, String[] bArr, String label) {
        Set<Integer> indicesToSave = new HashSet<>();
        if (bArr != null) {
            for (String index : bArr) {
                try {
                    indicesToSave.add(Integer.parseInt(index));
                } catch (NumberFormatException ignored) {
                }
            }
        }

        JSONObject sampleFeature = features.get(0);
        JSONObject properties = (JSONObject) sampleFeature.get("properties");

        StringBuilder insertSql = new StringBuilder("INSERT INTO " + tableName + " (");
        StringBuilder valuesSql = new StringBuilder("VALUES (");
        boolean firstColumn = true;

        for (Object key : properties.keySet()) {
            if (!firstColumn) {
                insertSql.append(", ");
                valuesSql.append(", ");
            }
            insertSql.append("\"" + key + "\"");
            valuesSql.append("?");
            firstColumn = false;
        }

        insertSql.append(", \"").append(tableName).append("_ID\"");
        insertSql.append(", \"LNG\"");
        insertSql.append(", \"LAT\"");
        insertSql.append(", \"FILE_NAME\"");
        insertSql.append(", \"SHP_TYPE\"");
        insertSql.append(", \"LABEL_COLUMN\"");
        insertSql.append(", \"WEIGHT\"");
        insertSql.append(", \"COLOR\"");
        insertSql.append(", \"FONT_SIZE\"");
        insertSql.append(", \"FONT_COLOR\"");

        insertSql.append(")");

        valuesSql.append(",? ,? ,? ,? ,? ,? , '8' ,'#1aa3ff' ,'12' ,'#000')");

        String sql = insertSql + " " + valuesSql;

        // insert 실행
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {

                JSONObject feature = features.get(i);
                JSONObject properties = (JSONObject) feature.get("properties");
                JSONObject geometry = (JSONObject) feature.get("geometry");

                int parameterIndex = 1;
                for (Object key : properties.keySet()) {
                    ps.setString(parameterIndex++, String.valueOf(properties.get(key)));
                }

                JSONArray coordinates = (JSONArray) geometry.get("coordinates");
                ps.setInt(parameterIndex++, (i+1));
                ps.setString(parameterIndex++, coordinates.get(0) + "");
                ps.setString(parameterIndex++, coordinates.get(1) + "");
                ps.setString(parameterIndex++, tableName);
                ps.setString(parameterIndex++, shpType);
                ps.setString(parameterIndex, label);
            }

            @Override
            public int getBatchSize() {
                return (bArr == null) ? features.size() : indicesToSave.size();
            }
        });
    }

    private void saveLink(String tableName, List<JSONObject> features, String shpType, String[] bArr, String label) {
        Set<Integer> indicesToSave = new HashSet<>();
        if (bArr != null) {
            for (String index : bArr) {
                try {
                    indicesToSave.add(Integer.parseInt(index));
                } catch (NumberFormatException ignored) {
                }
            }
        }

        JSONObject sampleFeature = features.get(0);
        JSONObject properties = (JSONObject) sampleFeature.get("properties");

        StringBuilder insertSql = new StringBuilder("INSERT INTO " + tableName + " (");
        StringBuilder valuesSql = new StringBuilder("VALUES (");
        boolean firstColumn = true;

        for (Object key : properties.keySet()) {
            if (!firstColumn) {
                insertSql.append(", ");
                valuesSql.append(", ");
            }
            insertSql.append("\"" + key + "\"");
            valuesSql.append("?");
            firstColumn = false;
        }

        insertSql.append(", \"").append(tableName).append("_ID\"");
        insertSql.append(", \"FILE_NAME\"");
        insertSql.append(", \"SHP_TYPE\"");
        insertSql.append(", \"GEOMETRY\"");
        insertSql.append(", \"F_LNG\"");
        insertSql.append(", \"F_LAT\"");
        insertSql.append(", \"T_LNG\"");
        insertSql.append(", \"T_LAT\"");
        insertSql.append(", \"LABEL_COLUMN\"");

        insertSql.append(", \"WEIGHT\"");
        insertSql.append(", \"COLOR\"");
        insertSql.append(", \"FONT_SIZE\"");
        insertSql.append(", \"FONT_COLOR\"");

        insertSql.append(")");

        valuesSql.append(",? ,? ,? ,? ,? ,? ,? ,? ,? ,'2' ,'#888' ,'12' ,'#000')");

        String sql = insertSql + " " + valuesSql;

        // insert 실행
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                int actualIndex = (bArr == null) ? i : (int) indicesToSave.toArray()[i];
                JSONObject feature = features.get(actualIndex);
                JSONObject properties = (JSONObject) feature.get("properties");
                JSONObject geometry = (JSONObject) feature.get("geometry");

                // MultiLineString 과 LineString 을 구분하여 입력하기 위한 타입 구분
                String shpType = (String) geometry.get("type");
                JSONArray coordinates = (JSONArray) ((JSONArray) geometry.get("coordinates")).get(0);
                if (shpType.equals("LineString")) {
                    coordinates = (JSONArray) (geometry.get("coordinates"));
                } else if (shpType.equals("MultiLineString")) {
                    coordinates = (JSONArray) ((JSONArray) geometry.get("coordinates")).get(0);
                }

                int parameterIndex = 1;
                for (Object key : properties.keySet()) {
                    ps.setString(parameterIndex++, String.valueOf(properties.get(key)));
                }

                ps.setInt(parameterIndex++, i+1);
                ps.setString(parameterIndex++, tableName);
                ps.setString(parameterIndex++, "link");
                ps.setString(parameterIndex++, geometry.toString());

                JSONArray fromCoordinate = (JSONArray) coordinates.get(0);
                JSONArray toCoordinate = (JSONArray) coordinates.get(coordinates.size()-1);
                // F_LNG
                ps.setString(parameterIndex++, fromCoordinate.get(0).toString());
                // F_LAT
                ps.setString(parameterIndex++, fromCoordinate.get(1).toString());
                // T_LNG
                ps.setString(parameterIndex++, toCoordinate.get(0).toString());
                // T_LAT
                ps.setString(parameterIndex++, toCoordinate.get(1).toString());
                // 기본 라벨
                ps.setString(parameterIndex, label);
            }

            @Override
            public int getBatchSize() {
                return (bArr == null) ? features.size() : indicesToSave.size();
            }
        });
    }

    private void savePolygon(String tableName, List<JSONObject> features, String shpType, String[] bArr, String label) {
        Set<Integer> indicesToSave = new HashSet<>();
        if (bArr != null) {
            for (String index : bArr) {
                try {
                    indicesToSave.add(Integer.parseInt(index));
                } catch (NumberFormatException ignored) {
                }
            }
        }

        JSONObject sampleFeature = features.get(0);
        JSONObject properties = (JSONObject) sampleFeature.get("properties");

        StringBuilder insertSql = new StringBuilder("INSERT INTO " + tableName + " (");
        StringBuilder valuesSql = new StringBuilder("VALUES (");
        boolean firstColumn = true;

        for (Object key : properties.keySet()) {
            if (!firstColumn) {
                insertSql.append(", ");
                valuesSql.append(", ");
            }
            insertSql.append("\"" + key + "\"");
            valuesSql.append("?");
            firstColumn = false;
        }

        insertSql.append(", \"").append(tableName).append("_ID\"");
        insertSql.append(", \"FILE_NAME\"");
        insertSql.append(", \"SHP_TYPE\"");
        insertSql.append(", \"GEOMETRY\"");
        insertSql.append(", \"LABEL_COLUMN\"");
        insertSql.append(", \"WEIGHT\"");
        insertSql.append(", \"COLOR\"");
        insertSql.append(", \"FONT_SIZE\"");
        insertSql.append(", \"FONT_COLOR\"");
        insertSql.append(")");

//      valuesSql.append(", ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        valuesSql.append(",? ,? ,? ,? ,? ,'2.5' ,'#000' ,'12' ,'#000')");

        String sql = insertSql + " " + valuesSql;

        // insert 실행
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                int actualIndex = (bArr == null) ? i : (int) indicesToSave.toArray()[i];
                JSONObject feature = features.get(actualIndex);
                JSONObject properties = (JSONObject) feature.get("properties");
                JSONObject geometry = (JSONObject) feature.get("geometry");

                // MultiLineString 과 LineString 을 구분하여 입력하기 위한 타입 구분
                String shpType = (String) geometry.get("type");
                JSONArray coordinates = (JSONArray) geometry.get("coordinates");
                if (shpType.equals("Polygon")) {
                    coordinates = (JSONArray) (geometry.get("coordinates"));
                } else if (shpType.equals("MultiPolygon")) {
                    coordinates = (JSONArray) ((JSONArray) geometry.get("coordinates")).get(0);
                }

                int parameterIndex = 1;
                for (Object key : properties.keySet()) {
                    ps.setString(parameterIndex++, String.valueOf(properties.get(key)));
                }

                ps.setInt(parameterIndex++, i+1);
                ps.setString(parameterIndex++, tableName);
                ps.setString(parameterIndex++, "polygon");
                ps.setString(parameterIndex++, geometry.toString());

                // 기본 라벨
                ps.setString(parameterIndex, label);
            }

            @Override
            public int getBatchSize() {
                return (bArr == null) ? features.size() : indicesToSave.size();
            }
        });
    }

    private String checkFeatureType(JSONObject geometry) {
        String typeString = (String) geometry.get("type");

        if (typeString.contains("LineString")) {
            return "Link";
        } else if (typeString.contains("Point")) {
            return "Point";
        } else if (typeString.contains("Polygon")) {
            return "Polygon";
        }

        return "";
    }

    private boolean isTableExists(String tableName) {
        try (Connection connection = jdbcTemplate.getDataSource().getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            try (ResultSet resultSet = metaData.getTables(null, null, tableName.toUpperCase(), new String[]{"TABLE"})) {
                return resultSet.next();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public String convertShpToGeoJSON(File shpFile, File outputDir) throws IOException, FactoryException, TransformException {
        File prjFile = findFile(outputDir, ".prj");

        CoordinateReferenceSystem sourceCRS;
        if (prjFile != null ) {
            sourceCRS = extractCRS(prjFile);
            System.out.println(sourceCRS.getName());
        } else {
            System.out.println("PRJ 없음");
            sourceCRS = getDefaultTMCRS();
        }

        return getString(shpFile, sourceCRS);
    }

    private String getString(File shpFile, CoordinateReferenceSystem sourceCRS) throws IOException, FactoryException, TransformException {
        String geoJson;
        ShapefileDataStore store = new ShapefileDataStore(shpFile.toURI().toURL());
        SimpleFeatureSource source = store.getFeatureSource();
        SimpleFeatureCollection featureCollection = source.getFeatures();
        FeatureJSON fjson = new FeatureJSON();

        // 원래 좌표계가 WGS84가 아니고, sourceCRS가 null이 아닌 경우에만 변환 수행
        if (sourceCRS != null && !"EPSG:4326".equals(sourceCRS.getName())) {
            System.out.println("좌표 변환 수행");
            // 좌표 변환 수행
            featureCollection = transformFeatureCollection(featureCollection, sourceCRS);
        }

        try (StringWriter writer = new StringWriter()) {
            System.out.println("쓰는중");
            fjson.writeFeatureCollection(featureCollection, writer);
            geoJson = new String(writer.toString().getBytes(StandardCharsets.ISO_8859_1), "EUC-KR");

            // 파일명에서 .shp 확장자 제거
            String targetText = shpFile.getName().replace(".shp", "");
            geoJson = geoJson.replace(targetText, "");
            System.out.println("확장자 제거 완료");
            return geoJson;
        } finally {
            // 사용한 SimpleFeatureIterator를 닫아줌
            store.dispose();
        }
    }

    public CoordinateReferenceSystem extractCRS(File prjFile) throws IOException, FactoryException {
        // 파일을 읽을 때 try-with-resources 문 사용하여 안전하게 자원 해제
        try (BufferedReader reader = new BufferedReader(new FileReader(prjFile, StandardCharsets.UTF_8))) {
            StringBuilder stringBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                stringBuilder.append(line);
            }
            return CRS.parseWKT(stringBuilder.toString());
        }
    }

    public File findFile(File directory, String type) {
        File[] files = directory.listFiles((dir, name) -> name.toLowerCase().endsWith(type));
        if (files != null && files.length > 0) {
            return files[0];
        } else {
            return null;
        }
    }

    // 좌표 변환을 수행하는 메서드
    private SimpleFeatureCollection transformFeatureCollection(SimpleFeatureCollection featureCollection, CoordinateReferenceSystem sourceCRS) throws FactoryException, TransformException {
        // 타겟 좌표계 (WGS84)
        CoordinateReferenceSystem targetCRS = CRS.decode("EPSG:4326");

        List<SimpleFeature> transformedFeatures = new ArrayList<>();
        try (SimpleFeatureIterator iterator = featureCollection.features()) {
            int id = 1;
            while (iterator.hasNext()) {
                SimpleFeature feature = iterator.next();
                Geometry geometry = (Geometry) feature.getDefaultGeometry();

                Geometry transformedGeometry = null;
                if (sourceCRS.getName().toString().indexOf("EPSG:Korean 1985") > -1) {
                    // 1단계: Proj4j를 사용한 좌표 변환 시도
                    transformedGeometry = transformGeometryWithProj4j(geometry, sourceCRS, targetCRS);
                } else {
                    // 2단계: Proj4j 변환 실패 시 GeoTools로 대체
                    transformedGeometry = transformGeometryWithGeoTools(geometry, sourceCRS, targetCRS);
                }

                // 변환된 Geometry로 SimpleFeature를 업데이트
                SimpleFeatureBuilder featureBuilder = new SimpleFeatureBuilder(feature.getFeatureType());
                featureBuilder.addAll(feature.getAttributes());
                featureBuilder.set(feature.getDefaultGeometryProperty().getName(), transformedGeometry);
                SimpleFeature transformedFeature = featureBuilder.buildFeature(String.valueOf(id));
                transformedFeatures.add(transformedFeature);
                id++;
            }
        }

        // 변환된 FeatureCollection 반환
        return DataUtilities.collection(transformedFeatures);
    }

    // Proj4j로 변환 시도
    private Geometry transformGeometryWithProj4j(Geometry geometry, CoordinateReferenceSystem sourceCRS, CoordinateReferenceSystem targetCRS) {
        CoordinateTransformFactory ctFactory = new CoordinateTransformFactory();
        CRSFactory crsFactory = new CRSFactory();

        // 좌표계 정의
        org.locationtech.proj4j.CoordinateReferenceSystem sourceProjection = crsFactory.createFromParameters("source", PROJ_KTM);
        org.locationtech.proj4j.CoordinateReferenceSystem targetProjection = crsFactory.createFromParameters("target", PROJ_WGS84);

        // 좌표계 변환 객체 생성
        CoordinateTransform transform = ctFactory.createTransform(sourceProjection, targetProjection);

        // 변환 수행 (거리값이 일치하지 않기 때문에 조절 함수로 대체)
        return transformGeometry(geometry, transform);
    }

    // GeoTools로 변환 시도
    private Geometry transformGeometryWithGeoTools(Geometry geometry, CoordinateReferenceSystem sourceCRS, CoordinateReferenceSystem targetCRS) throws FactoryException, TransformException, TransformException {
        boolean lenient = true; // 자동 매개변수 변환을 허용
        MathTransform transform = CRS.findMathTransform(sourceCRS, targetCRS, lenient);

        // Geometry 변환
        Geometry transformedGeometry = JTS.transform(geometry, transform);

        // 변환된 좌표 가져오기
        Coordinate[] coords = transformedGeometry.getCoordinates();

        // 좌표가 올바른지 확인하고 필요시 x와 y를 교환
        if (!isValidLatitude(coords[0].y)) {
            swapCoordinates(coords);
            transformedGeometry = geometryFactory.createGeometry(transformedGeometry);
        }

        return transformedGeometry;
    }

    // Geometry 변환을 위한 메소드 (Proj4j)
    private Geometry transformGeometry(Geometry geometry, CoordinateTransform transform) {
        // 좌표 배열을 가져옴
        Coordinate[] coords = geometry.getCoordinates();
        ProjCoordinate srcCoord = new ProjCoordinate();
        ProjCoordinate destCoord = new ProjCoordinate();

        // X축 방향의 오프셋 값
        double xOffset = 0.00285; // X축 오프셋 대략 280M
        double yOffset = 0;     // Y축 오프셋 0

        // 좌표 변환 적용
        for (int i = 0; i < coords.length; i++) {
            srcCoord.x = coords[i].x;
            srcCoord.y = coords[i].y;
            transform.transform(srcCoord, destCoord);
            // 변환된 좌표에 오프셋 적용
            coords[i].x = destCoord.x + xOffset;
            coords[i].y = destCoord.y + yOffset;
        }

        // 변환된 좌표 배열로 새 Geometry 객체 생성
        return geometryFactory.createGeometry(geometry);
    }

    // TM 테스트 좌표계 임시 정의
    private CoordinateReferenceSystem getDefaultTMCRS() throws FactoryException {
        return CRS.decode("EPSG:2097");
    }

    private static GeometryFactory geometryFactory = new GeometryFactory();

    private boolean isValidLatitude(double value) {
        return value >= -90.0 && value <= 90.0;
    }

    // 좌표 순서를 확인하고 변환이 필요한 경우 변환하는 메서드
    private static Geometry correctCoordinates(Geometry geometry) {
        Coordinate[] coords = geometry.getCoordinates();

        if (coords.length > 0 && isLatitude(coords[0].x) && isLongitude(coords[0].y)) {
            return switchCoordinates(geometry);
        }
        return geometry; // 이미 올바른 좌표 순서인 경우 변경하지 않음
    }
    // 주어진 값이 위도인지 확인하는 메서드
    private static boolean isLatitude(double value) {
        return value >= -90 && value <= 90;
    }

    // 주어진 값이 경도인지 확인하는 메서드
    private static boolean isLongitude(double value) {
        return value >= -180 && value <= 180;
    }
    // 좌표 순서를 변환하는 메서드 (모든 Geometry 유형에 대해 처리)
    private static Geometry switchCoordinates(Geometry geometry) {
        if (geometry instanceof Point) {
            return switchPointCoordinates((Point) geometry);
        } else if (geometry instanceof LineString) {
            return switchLineStringCoordinates((LineString) geometry);
        } else if (geometry instanceof Polygon) {
            return switchPolygonCoordinates((Polygon) geometry);
        } else if (geometry instanceof MultiPoint) {
            return switchMultiPointCoordinates((MultiPoint) geometry);
        } else if (geometry instanceof MultiLineString) {
            return switchMultiLineStringCoordinates((MultiLineString) geometry);
        } else if (geometry instanceof MultiPolygon) {
            return switchMultiPolygonCoordinates((MultiPolygon) geometry);
        } else {
            throw new IllegalArgumentException("지원되지 않는 Geometry 유형입니다: " + geometry.getGeometryType());
        }
    }

    private static Point switchPointCoordinates(Point point) {
        return geometryFactory.createPoint(switchCoordinate(point.getCoordinate()));
    }

    private static LineString switchLineStringCoordinates(LineString lineString) {
        return geometryFactory.createLineString(switchCoordinates(lineString.getCoordinates()));
    }

    private static Polygon switchPolygonCoordinates(Polygon polygon) {
        LinearRing shell = geometryFactory.createLinearRing(switchCoordinates(polygon.getExteriorRing().getCoordinates()));
        LinearRing[] holes = new LinearRing[polygon.getNumInteriorRing()];
        for (int i = 0; i < polygon.getNumInteriorRing(); i++) {
            holes[i] = geometryFactory.createLinearRing(switchCoordinates(polygon.getInteriorRingN(i).getCoordinates()));
        }
        return geometryFactory.createPolygon(shell, holes);
    }

    private static MultiPoint switchMultiPointCoordinates(MultiPoint multiPoint) {
        return geometryFactory.createMultiPoint(switchCoordinates(multiPoint.getCoordinates()));
    }

    private static MultiLineString switchMultiLineStringCoordinates(MultiLineString multiLineString) {
        LineString[] lineStrings = new LineString[multiLineString.getNumGeometries()];
        for (int i = 0; i < multiLineString.getNumGeometries(); i++) {
            lineStrings[i] = switchLineStringCoordinates((LineString) multiLineString.getGeometryN(i));
        }
        return geometryFactory.createMultiLineString(lineStrings);
    }

    private static MultiPolygon switchMultiPolygonCoordinates(MultiPolygon multiPolygon) {
        Polygon[] polygons = new Polygon[multiPolygon.getNumGeometries()];
        for (int i = 0; i < multiPolygon.getNumGeometries(); i++) {
            polygons[i] = switchPolygonCoordinates((Polygon) multiPolygon.getGeometryN(i));
        }
        return geometryFactory.createMultiPolygon(polygons);
    }

    private static Coordinate[] switchCoordinates(Coordinate[] coordinates) {
        for (Coordinate coord : coordinates) {
            switchCoordinate(coord);
        }
        return coordinates;
    }

    private static Coordinate switchCoordinate(Coordinate coord) {
        double temp = coord.x;
        coord.x = coord.y;
        coord.y = temp;
        return coord;
    }

    private void swapCoordinates(Coordinate[] coords) {
        for (Coordinate coord : coords) {
            double temp = coord.x;
            coord.x = coord.y;
            coord.y = temp;
        }
    }
}
