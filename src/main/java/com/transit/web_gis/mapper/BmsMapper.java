package com.transit.web_gis.mapper;

import com.transit.web_gis.vo.BmsVo;
import org.apache.ibatis.annotations.Mapper;

import java.util.HashMap;
import java.util.List;

@Mapper
public interface BmsMapper {
    List<BmsVo> getStation(HashMap<String, Object> map);
    List<BmsVo> getLink(HashMap<String, Object> map);
    List<BmsVo> getNode(HashMap<String, Object> map);
}
