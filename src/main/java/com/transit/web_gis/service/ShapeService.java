package com.transit.web_gis.service;

import com.transit.web_gis.mapper.ShapeMapper;
import com.transit.web_gis.vo.ShpVo;
import org.apache.tika.Tika;
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

import org.geotools.referencing.crs.DefaultGeographicCRS;
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

import org.opengis.geometry.DirectPosition;
import org.opengis.geometry.coordinate.Position;

import com.transit.web_gis.util.ShapeUtil;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.*;
import java.util.*;

import org.opengis.geometry.DirectPosition;
import org.opengis.geometry.coordinate.Position;

import org.locationtech.jts.geom.Coordinate;

@Service
public class ShapeService {

  // EPSG:2097 (Korean Transverse Mercator) PROJ 문자열 정의
  private static final String PROJ_KTM = "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43";

  private static final String PROJ_WGS84 = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs";
  private static final String PROJ_BESSEL = "+proj=tmerc" // Transverse Mercator 투영법
      + " +lat_0=38" // Latitude of Origin (초기 위도)
      + " +lon_0=127.0028902777778" // Central Meridian (중부원점 경도)
      + " +k=1.0" // Scale Factor (축척계수)
      + " +x_0=200000" // False Easting (가산 동거)
      + " +y_0=500000" // False Northing (가산 북거)
      + " +ellps=bessel" // Bessel 1841 타원체
      + " +towgs84=-145.907,505.034,685.756,-1.162,2.347,1.592,6.342 " // 수정된 변환 파라미터
      + " +pm=greenwich" // 본초 자오선 (Greenwich)
      + " +units=m" // 미터 단위
      + " +no_defs";

  // 리눅스 경로
  private static final File tempDir = new File("/app/shapefile_temp");
  private static final File geoDir = new File("/app/geoJson");
  // private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");
  // private static final File geoDir = new File("C:\\mapbox\\geoJson");

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

  public Map<String, Object> getDefaultColor(String fileName) {
    return shapeMapper.getDefaultColor(fileName);
  }

  public Map<String, Object> getDefaultWeight(String fileName) {
    return shapeMapper.getDefaultWeight(fileName);
  }

  public Map<String, Object> getDefaultFontColor(String fileName) {
    return shapeMapper.getDefaultFontColor(fileName);
  }

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
  public Map<String, Object> saveSelectedFeatures(String tableName, String idxArr, boolean isChecked, String shpType,
      String label) {
    Map<String, Object> resultMap = new HashMap<>();

    File geoJsonFile = new File(geoDir, tableName + ".json");

    String[] bArr = idxArr.replace("[", "").replace("]", "").split(",");

    if (geoJsonFile.exists()) {
      try {
        String createTableSql = createTableSqlFromGeoJson(geoJsonFile, tableName);
        jdbcTemplate.execute(createTableSql);

        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(new FileInputStream(geoJsonFile)))) {
          // feature 를 DB에 넣는 로직
          StringBuilder jsonContent = new StringBuilder();
          int i;
          while ((i = reader.read()) != -1) {
            jsonContent.append((char) i);
          }

          JSONParser jsonParser = new JSONParser();
          JSONObject geoJson = (JSONObject) jsonParser.parse(jsonContent.toString());
          JSONArray features = (JSONArray) geoJson.get("features");
          String typeString = checkFeatureType((JSONObject) ((JSONObject) features.get(0)).get("geometry"));
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
          createTableSql.append("\"" + key + "\"").append(" VARCHAR2(255)");
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
        if (!isWithinWGS84Range(coordinates)) {
          coordinates = transformCoordinates(coordinates, false);
        }

        ps.setInt(parameterIndex++, (i + 1));
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

    int totalSize = (bArr == null) ? features.size() : indicesToSave.size();

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

    valuesSql.append(",? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,?)");

    String sql = insertSql + " " + valuesSql;

    // insert 실행
    for (int offset = 0; offset < totalSize; offset += 550) {
      final int currentOffset = offset;
      jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
        @Override
        public void setValues(PreparedStatement ps, int i) throws SQLException {
          try {
            int actualIndex = currentOffset + i;
            actualIndex = (bArr == null) ? actualIndex : (int) indicesToSave.toArray()[actualIndex];

            JSONObject feature = features.get(actualIndex);
            JSONObject properties = (JSONObject) feature.get("properties");
            JSONObject geometry = (JSONObject) feature.get("geometry");

            // MultiLineString 과 LineString 을 구분하여 입력하기 위한 타입 구분
            String geomType = (String) geometry.get("type");
            JSONArray coordinates;

            if (geomType.equals("LineString")) {
              coordinates = (JSONArray) geometry.get("coordinates");
            } else if (geomType.equals("MultiLineString")) {
              coordinates = (JSONArray) ((JSONArray) geometry.get("coordinates")).get(0);
            } else {
              throw new SQLException("Unsupported geometry type: " + geomType);
            }

            // coordinates = transformCoordinates(coordinates, true);

            geometry.put("type", "LineString");
            geometry.put("coordinates", coordinates);

            // properties 설정
            int parameterIndex = 1;
            for (Object key : properties.keySet()) {
              ps.setString(parameterIndex++, String.valueOf(properties.get(key)));
            }

            // 나머지 필드 설정
            ps.setInt(parameterIndex++, i + 1);
            ps.setString(parameterIndex++, tableName);
            ps.setString(parameterIndex++, "link");
            ps.setString(parameterIndex++, geometry.toString());

            // 변환된 좌표로 시작점과 끝점 설정
            JSONArray fromCoordinate = (JSONArray) coordinates.get(0);
            JSONArray toCoordinate = (JSONArray) coordinates.get(coordinates.size() - 1);

            // F_LNG, F_LAT
            ps.setString(parameterIndex++, fromCoordinate.get(0).toString());
            ps.setString(parameterIndex++, fromCoordinate.get(1).toString());
            // T_LNG, T_LAT
            ps.setString(parameterIndex++, toCoordinate.get(0).toString());
            ps.setString(parameterIndex++, toCoordinate.get(1).toString());
            // 라벨 설정
            ps.setString(parameterIndex++, label);

            // 추가 파라미터 설정
            ps.setString(parameterIndex++, "2"); // WEIGHT
            ps.setString(parameterIndex++, "#888"); // COLOR
            ps.setString(parameterIndex++, "12"); // FONT_SIZE
            ps.setString(parameterIndex++, "#000"); // FONT_COLOR

          } catch (Exception e) {
            throw new SQLException("Error processing feature at index " + i, e);
          }
        }

        @Override
        public int getBatchSize() {
          return Math.min(550, totalSize - currentOffset);
        }
      });
    }
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

        ps.setInt(parameterIndex++, i + 1);
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

  public String convertShpToGeoJSON(File shpFile, File outputDir) throws IOException {
    String geoJson;
    ShapefileDataStore store = null;

    try {
      store = new ShapefileDataStore(shpFile.toURI().toURL());
      File prjFile = new File(shpFile.getAbsolutePath().replace(".shp", ".prj"));

      // .prj 파일을 기반으로 Charset 설정
      Charset charSet = Charset.defaultCharset(); // 기본 Charset 설정
      if (prjFile.exists()) {
        String prjContent = Files.readString(prjFile.toPath(), StandardCharsets.UTF_8);
        if (prjContent.contains("Korean")) { // 예: 좌표계에 한국 관련 키워드 포함 시
          charSet = Charset.forName("EUC-KR");
        } else if (prjContent.contains("UTF-8")) { // UTF-8 관련 키워드
          charSet = StandardCharsets.UTF_8;
        }
      } else {
        // prj 파일이 없을 경우 기존 로직 유지
        charSet = detectDbfEncoding(shpFile);
      }

      store.setCharset(charSet);

      // FeatureCollection 생성
      SimpleFeatureSource source = store.getFeatureSource();
      SimpleFeatureCollection featureCollection = source.getFeatures();

      // GeoJSON 변환
      FeatureJSON fjson = new FeatureJSON();
      try (StringWriter writer = new StringWriter()) {
        fjson.writeFeatureCollection(featureCollection, writer);
        geoJson = writer.toString();

        // charset 변환 처리
        if ("ISO-8859-1".equalsIgnoreCase(store.getCharset().name())) {
          byte[] byteArray = geoJson.getBytes(StandardCharsets.ISO_8859_1);
          geoJson = new String(byteArray, Charset.forName("EUC-KR"));
        }

        // GeoJSON 파싱 및 좌표 변환
        JSONParser parser = new JSONParser();
        JSONObject geoJsonObj = (JSONObject) parser.parse(geoJson);
        JSONArray features = (JSONArray) geoJsonObj.get("features");

        // 각 feature의 coordinates 변환
        for (Object featureObj : features) {
          JSONObject feature = (JSONObject) featureObj;
          JSONObject geometry = (JSONObject) feature.get("geometry");
          String type = (String) geometry.get("type");

          if ("LineString".equals(type)) {
            JSONArray coordinates = (JSONArray) geometry.get("coordinates");
            geometry.put("coordinates", transformCoordinates(coordinates, true));
          } else if ("MultiLineString".equals(type)) {
            JSONArray multiCoordinates = (JSONArray) geometry.get("coordinates");
            for (int i = 0; i < multiCoordinates.size(); i++) {
              multiCoordinates.set(i, transformCoordinates((JSONArray) multiCoordinates.get(i), true));
            }
          } else if ("Point".equals(type)) {
            JSONArray coordinates = (JSONArray) geometry.get("coordinates");
            geometry.put("coordinates", transformCoordinates(coordinates, false));
          }
        }

        // 변환된 GeoJSON을 문자열로 변환
        geoJson = geoJsonObj.toString();

        // 파일명 처리
        String targetText = shpFile.getName().replace(".shp", "");
        geoJson = geoJson.replace(targetText, "");

        return geoJson;
      } catch (ParseException e) {
        throw new RuntimeException("Failed to parse GeoJSON", e);
      }
    } finally {
      if (store != null) {
        store.dispose();
      }
    }
  }

  public CoordinateReferenceSystem extractCRS(File prjFile) throws IOException, FactoryException {
    // 파일을 읽을 때 try-with-resources 문 사용하여 안전하게 자원 해제
    try (BufferedReader reader = new BufferedReader(new FileReader(prjFile))) {
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

  // 좌표계 변환을 위한 새로운 메서드
  private JSONArray transformCoordinates(JSONArray coordinates, boolean isLink) {
    JSONArray transformedCoordinates = new JSONArray();

    try {
      if (isLink) {
        for (Object coord : coordinates) {
          if (coord instanceof JSONArray) {
            JSONArray coordinate = (JSONArray) coord;
            if (coordinate.size() >= 2) {
              // Math.round(coordinate.x * 1000000) / 1000000.0
              double x = Double.parseDouble(coordinate.get(0).toString());
              double y = Double.parseDouble(coordinate.get(1).toString());

              // 좌표값 유효성 검사
              if (x < 0 || y < 0) {
                continue;
              }

              ShapeUtil shapeUtil = new ShapeUtil();
              // ShapeUtil을 사용한 좌표 변환

              x = Math.round(x * 1000000) / 1000000.0;
              y = Math.round(y * 1000000) / 1000000.0;
              double[] wgsCoord = shapeUtil.TM2WGS(x, y);

              System.out.println("변환된 좌표: " + wgsCoord[0] + ", " + wgsCoord[1]);

              // 변환된 좌표값 검증
              if (wgsCoord[0] >= -180 && wgsCoord[0] <= 180 &&
                  wgsCoord[1] >= -90 && wgsCoord[1] <= 90) {
                JSONArray transformedCoord = new JSONArray();
                transformedCoord.add(wgsCoord[0]); // 경도
                transformedCoord.add(wgsCoord[1]); // 위도
                transformedCoordinates.add(transformedCoord);
              }
            }
          }
        }
      } else {
        // 노드일 때 (단일 좌표 변환)
        if (coordinates.size() >= 2) {
          double x = Double.parseDouble(coordinates.get(0).toString());
          double y = Double.parseDouble(coordinates.get(1).toString());

          // ShapeUtil을 사용한 좌표 변환
          ShapeUtil shapeUtil = new ShapeUtil();
          x = Math.round(x * 1000000) / 1000000.0;
          y = Math.round(y * 1000000) / 1000000.0;
          double[] wgsCoord = shapeUtil.TM2WGS(x, y);

          transformedCoordinates.add(wgsCoord[0]); // 경도
          transformedCoordinates.add(wgsCoord[1]); // 위도
        }
      }
    } catch (Exception e) {
      return coordinates; // 변환 실패시 원본 반환
    }

    return transformedCoordinates.isEmpty() ? coordinates : transformedCoordinates;
    // JSONArray transformedCoordinates = new JSONArray();

    // try {
    // // 1. TM_Korea -> Bessel -> WGS84 변환 파라미터 추가
    // String tmWkt = "PROJCS[\"TM_Korea\"," +
    // "GEOGCS[\"GCS_Tokyo\"," +
    // "DATUM[\"D_Tokyo\"," +
    // "SPHEROID[\"Bessel_1841\",6377397.155,299.1528128]," +
    // "TOWGS84[-146.43,507.89,681.46,0,0,0,0]]," +
    // "PRIMEM[\"Greenwich\",0.0]," +
    // "UNIT[\"Degree\",0.0174532925199433]]," +
    // "PROJECTION[\"Transverse_Mercator\"]," +
    // "PARAMETER[\"False_Easting\",200000.0]," +
    // "PARAMETER[\"False_Northing\",500000.0]," +
    // "PARAMETER[\"Central_Meridian\",127.0028902777778]," +
    // "PARAMETER[\"Scale_Factor\",1.0]," +
    // "PARAMETER[\"Latitude_Of_Origin\",38.0]," +
    // "UNIT[\"Meter\",1.0]]";

    // CoordinateReferenceSystem sourceCRS = CRS.parseWKT(tmWkt);
    // CoordinateReferenceSystem targetCRS = DefaultGeographicCRS.WGS84;

    // // 2. 변환 정밀도 향상을 위한 설정
    // MathTransform transform = CRS.findMathTransform(sourceCRS, targetCRS, true);

    // // 변환 전 좌표값 검증
    // if (isLink) {
    // for (Object coord : coordinates) {
    // if (coord instanceof JSONArray) {
    // JSONArray coordinate = (JSONArray) coord;
    // if (coordinate.size() >= 2) {
    // double x = Double.parseDouble(coordinate.get(0).toString());
    // double y = Double.parseDouble(coordinate.get(1).toString());

    // // 3. 좌표값 유효성 검사 추가
    // if (x < 0 || y < 0) {
    // System.out.println("경고: 음수 좌표값 발견 - x:" + x + ", y:" + y);
    // continue;
    // }

    // Coordinate srcCoord = new Coordinate(x, y);
    // Coordinate destCoord = new Coordinate();
    // JTS.transform(srcCoord, destCoord, transform);

    // // 4. 변환된 좌표값 검증
    // if (destCoord.x >= -180 && destCoord.x <= 180 &&
    // destCoord.y >= -90 && destCoord.y <= 90) {
    // JSONArray transformedCoord = new JSONArray();
    // transformedCoord.add(destCoord.x);
    // transformedCoord.add(destCoord.y);
    // transformedCoordinates.add(transformedCoord);
    // } else {
    // System.out.println("경고: 변환된 좌표가 WGS84 범위를 벗어남 - lon:" +
    // destCoord.x + ", lat:" + destCoord.y);
    // }
    // }
    // }
    // }
    // } else {
    // // 노드일 때 (단일 좌표 변환)
    // if (coordinates.size() >= 2) {
    // double x = Double.parseDouble(coordinates.get(0).toString());
    // double y = Double.parseDouble(coordinates.get(1).toString());

    // System.out.println("원본 TM 좌표: x=" + x + ", y=" + y);

    // Coordinate srcCoord = new Coordinate(x, y);
    // Coordinate destCoord = new Coordinate();
    // JTS.transform(srcCoord, destCoord, transform);
    // double lon = destCoord.x;
    // double lat = destCoord.y;

    // System.out.println("변환된 WGS84 좌표: lon=" + lon + ", lat=" + lat);

    // transformedCoordinates.add(lon);
    // transformedCoordinates.add(lat);
    // }
    // }
    // } catch (Exception e) {
    // System.err.println("좌표 변환 중 오류 발생: " + e.getMessage());
    // e.printStackTrace();
    // return coordinates; // 변환 실패시 원본 반환
    // }

    // return transformedCoordinates.isEmpty() ? coordinates :
    // transformedCoordinates;
  }

  public Charset detectDbfEncoding(File dbfFile) {
    try (BufferedInputStream input = new BufferedInputStream(new FileInputStream(dbfFile))) {
      byte[] buffer = new byte[32];
      input.read(buffer);
      int languageDriver = buffer[29]; // 29번째 바이트는 Language Driver ID
      switch (languageDriver) {
        case 0x03:
          return Charset.forName("ISO-8859-1");
        case 0x57:
          return Charset.forName("UTF-8");
        case 0x71:
          return Charset.forName("EUC-KR");
        default:
          return Charset.defaultCharset();
      }
    } catch (IOException e) {
      e.printStackTrace();
      return Charset.defaultCharset();
    }
  }

  boolean isWithinWGS84Range(JSONArray coordinates) {
    if (coordinates.size() < 2) {
      return false;
    }

    double longitude = (double) coordinates.get(0); // 경도
    double latitude = (double) coordinates.get(1); // 위도

    // WGS84 범위를 확인
    return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
  }
}
