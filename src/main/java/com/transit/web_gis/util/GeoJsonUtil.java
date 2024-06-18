package com.transit.web_gis.util;

import com.transit.web_gis.service.BmsService;
import com.transit.web_gis.vo.BmsVo;
import lombok.RequiredArgsConstructor;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@RequiredArgsConstructor
public class GeoJsonUtil {

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
    private static BmsService bmsService;

    public static String getGeoJsonLink(List<BmsVo> datas) throws Exception{
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
            properties.put("linkId", data.getLinkId());
            properties.put("rgtrId", data.getRgtrId());
            properties.put("regDt", data.getRegDt());
            properties.put("linkDist", data.getLinkDist());
            properties.put("roadNm", data.getRoadNm());
            properties.put("bgngNodeId", data.getBgngNodeId());
            properties.put("endNodeId", data.getEndNodeId());
            properties.put("beginLat", data.getBeginLat());
            properties.put("beginLng", data.getBeginLng());
            properties.put("endLat", data.getEndLat());
            properties.put("endLng", data.getEndLng());

            //링크 lineString 좌표값 받아오기
            HashMap<String, Object> paramMap = new HashMap<>();

            paramMap.put("Sc_LINK_ID", data.getLinkId());

            List<BmsVo> coords = bmsService.getLinkPointByLinkId(paramMap);

            for(BmsVo coord : coords){
                List<Double> tmpCoord = new ArrayList<>(Arrays.asList(Double.parseDouble(coord.getLng()), Double.parseDouble(coord.getLat())));
                coordinates.add(tmpCoord);
            }

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public static String getGeoJsonStation(List<BmsVo> datas) {
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
            properties.put("stationId", data.getStationId());
            properties.put("stationNm", data.getStationNm());
            properties.put("linkId", data.getLinkId());
            properties.put("stationUseCd", data.getStationUseCd());
            properties.put("StationUseNm", data.getStationUseNm());
            properties.put("trsfStationYn", data.getTrsfStationYn());
            properties.put("trsfStationNm", data.getTrsfStationNm());
            properties.put("ctrdYn", data.getCtrdYn());
            properties.put("ctrdNm", data.getCtrdNm());
            properties.put("stationNmEng", data.getStationNmEng());
            properties.put("arsId", data.getArsId());
            properties.put("orgCd", data.getOrgCd());
            properties.put("gisYn", data.getGisYn());
            properties.put("rgtrId", data.getRgtrId());
            properties.put("regDt", data.getRegDt());
            properties.put("mdfrId", data.getMdfrId());
            properties.put("mdfcnDt", data.getMdfcnDt());
            properties.put("note", data.getNote());
            properties.put("stdgCd", data.getStdgCd());
            properties.put("areaCd", data.getAreaCd());
            properties.put("useYn", data.getUseYn());
            properties.put("stationNmChn", data.getStationNmChn());
            properties.put("stationNmJap", data.getStationNmJap());
            properties.put("stationNmVnm", data.getStationNmVnm());
            properties.put("lat", data.getLat());
            properties.put("lng", data.getLng());

            properties.put("bitInstlYn", data.getBitInstlYn());
            properties.put("bitPrYn", data.getBitPrYn());
            properties.put("stationTypeCd", data.getStationTypeCd());
            properties.put("bitTypeCd01", data.getBitTypeCd01());
            properties.put("bitTypeCd02", data.getBitTypeCd02());
            properties.put("bitTypeCd03", data.getBitTypeCd03());
            properties.put("bitTypeCd04", data.getBitTypeCd04());
            properties.put("bitTypeCd05", data.getBitTypeCd05());
            properties.put("bitTypeCd06", data.getBitTypeCd06());

            properties.put("lotNumAddr", data.getLotNumAddr());
            properties.put("rideTnsCnt", data.getRideTnsCnt());
            properties.put("alightCnt", data.getAlightCnt());

            //geometry 데이터 삽입
            coordinates.add(data.getLng());
            coordinates.add(data.getLat());

            features.add(feature);
        }

        return geojson.toJSONString();
    }

    public static String getGeoJsonNode(List<BmsVo> datas){
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
            properties.put("nodeId", data.getNodeId());
            properties.put("crossroadNm", data.getCrossroadNm());
            properties.put("areaCd", data.getAreaCd());
            properties.put("lat", data.getLat());
            properties.put("lng", data.getLng());


            //geometry 데이터 삽입
            coordinates.add(data.getLng());
            coordinates.add(data.getLat());

            features.add(feature);
        }

        return geojson.toJSONString();
    }
}
