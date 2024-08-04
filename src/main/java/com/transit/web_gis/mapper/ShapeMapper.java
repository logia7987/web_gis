package com.transit.web_gis.mapper;

import com.transit.web_gis.vo.ShpVo;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

@Mapper
public interface ShapeMapper {
    List<ShpVo> selectShpList();
    List<String> getShpColumnNames(String fileName);
    Map<String, Object> getDefaultLabel(String fileName);
    Map<String, Object> checkShpType(Map<String, Object> commandMap);
    List<Map<String, Object>> getNodeShpData(Map<String, Object> commandMap);
    List<Map<String, Object>> getLinkShpData(Map<String, Object> commandMap);
    List<Map<String, Object>> getPolygonShpData(Map<String, Object> commandMap);
    int checkHasShpFile(Map<String, Object> commandMap);
    int updateLabel(Map<String, Object> commandMap);
    int updateNodeStationShpData(Map<String, Object> commandMap);
    int updateLinkShpData(Map<String, Object> commandMap);
    int deleteShpFeatureData(Map<String, Object> commandMap);
    int insertShpTable(Map<String, Object> commandMap);
    void dropShpTable(Map<String, Object> commandMap);
    int updateProperties(Map<String, Object> commandMap);
}
