package com.transit.web_gis.mapper;

import com.transit.web_gis.vo.BmsVo;
import com.transit.web_gis.vo.ShpVo;
import org.apache.ibatis.annotations.Mapper;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Mapper
public interface ShapeMapper {
    List<ShpVo> selectShpList();

    List<Map<String, Object>> getShpData(Map<String, Object> commandMap);
}
