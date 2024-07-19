package com.transit.web_gis.service;

import com.transit.web_gis.mapper.ShapeMapper;
import com.transit.web_gis.vo.ShpVo;
import oracle.sql.ARRAY;
import org.geotools.data.DataUtilities;
import org.geotools.data.shapefile.ShapefileDataStore;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.data.simple.SimpleFeatureSource;
import org.geotools.feature.simple.SimpleFeatureBuilder;
import org.geotools.geojson.feature.FeatureJSON;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.geotools.referencing.crs.DefaultGeographicCRS;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.locationtech.jts.geom.Geometry;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.referencing.FactoryException;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import org.opengis.referencing.operation.TransformException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.rowset.serial.SerialArray;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.*;

@Service
public class ShapeService {

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
    public List<String> getShpColumnNames(String fileName) {
        return shapeMapper.getShpColumnNames(fileName);
    }
    public Map<String, Object> getDefaultLabel(String fileName) {
        return shapeMapper.getDefaultLabel(fileName);
    }
    public Map<String, Object> checkShpType(Map<String, Object> commandMap) {
        return shapeMapper.checkShpType(commandMap);
    }
    public List<Map<String, Object>> getNodeShpData(Map<String, Object> commandMap) {
        return shapeMapper.getNodeShpData(commandMap);
    }
    public List<Map<String, Object>> getLinkShpData(Map<String, Object> commandMap) {
        return shapeMapper.getLinkShpData(commandMap);
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

    public boolean checkTableExists(String tableName) {
        // Oracle에서는 테이블 이름을 대문자로 변환하여 쿼리합니다.
        String sql = "SELECT COUNT(*) FROM all_tables WHERE table_name = ? AND owner = 'TRANSIT'";
        Integer count = jdbcTemplate.queryForObject(sql, new Object[]{tableName.toUpperCase()}, Integer.class);
        return count != null && count > 0;
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
        } else {
            resultMap.put("result", "has");
            resultMap.put("message", "업로드한 파일이 현재 DB에 있습니다. 명칭을 수정하여 다시 업로드해주세요.");
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
                createTableSql.append(", \"").append(tableName).append("_ID\" NUMBER");

                // 분류를 위한 공통 컬럼
                createTableSql.append(", \"FILE_NAME\" VARCHAR2(100)");
                createTableSql.append(", \"SHP_TYPE\" VARCHAR2(100)");
                createTableSql.append(", \"LABEL_COLUMN\" VARCHAR2(100)");

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
        insertSql.append(")");

        valuesSql.append(",? , ?, ?, ?, ?, ?)");

        String sql = insertSql.toString() + " " + valuesSql.toString();

        // insert 실행
        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {

                JSONObject feature = features.get(i);
                JSONObject properties = (JSONObject) feature.get("properties");
                JSONObject geometry = (JSONObject) feature.get("geometry");

                int parameterIndex = 1;
                for (Object key : properties.keySet()) {
                    ps.setString(parameterIndex++, (String) properties.get(key));
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
        insertSql.append(")");

        valuesSql.append(", ?, ?, ?, ?, ?, ?, ?, ?, ?)");

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

    private String checkFeatureType(JSONObject geometry) {
        String typeString = (String) geometry.get("type");

        if (typeString.contains("LineString")) {
            return "Link";
        } else if (typeString.contains("Point")) {
            return "Point";
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

    public String convertShpToGeoJSON(File shpFile, File outputDir) throws IOException, FactoryException {
        File prjFile = findFile(outputDir, ".prj");

        CoordinateReferenceSystem sourceCRS = prjFile != null ? extractCRS(prjFile) : null;

        return getString(shpFile, sourceCRS);
    }

    private String getString(File shpFile, CoordinateReferenceSystem sourceCRS) throws IOException, FactoryException {
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
    private SimpleFeatureCollection transformFeatureCollection(SimpleFeatureCollection featureCollection, CoordinateReferenceSystem sourceCRS) {
        // 타겟 좌표계 (WGS84)
        CoordinateReferenceSystem targetCRS = DefaultGeographicCRS.WGS84;

        // 변환을 위한 MathTransform 생성
        MathTransform transform;
        try {
            transform = CRS.findMathTransform(sourceCRS, targetCRS, true);
        } catch (FactoryException e) {
            throw new RuntimeException("좌표 변환을 위한 MathTransform을 생성하는 동안 오류가 발생했습니다.", e);
        }

        // FeatureCollection의 각 Geometry를 변환
        List<SimpleFeature> transformedFeatures = new ArrayList<>();
        try (SimpleFeatureIterator iterator = featureCollection.features()) {
            int id = 1;
            while (iterator.hasNext()) {
                SimpleFeature feature = iterator.next();
                Geometry geometry = (Geometry) feature.getDefaultGeometry();

                Geometry transformedGeometry;
                try {
                    // 좌표 변환 적용
                    transformedGeometry = JTS.transform(geometry, transform);
                } catch (TransformException e) {
                    throw new RuntimeException("Geometry를 변환하는 동안 오류가 발생했습니다.", e);
                }

                // 변환된 Geometry로 SimpleFeature를 업데이트
                SimpleFeatureBuilder featureBuilder = new SimpleFeatureBuilder(feature.getFeatureType());
                featureBuilder.addAll(feature.getAttributes());
                featureBuilder.set(feature.getDefaultGeometryProperty().getName(), transformedGeometry);
                SimpleFeature transformedFeature = featureBuilder.buildFeature(String.valueOf(id));
                transformedFeatures.add(transformedFeature);
                id++;
            }
            // 변환된 FeatureCollection 반환
            return DataUtilities.collection(transformedFeatures);
        }
    }
}
