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
    List<BmsVo> getLinkPointByLinkId(HashMap<String, Object> map);
    int updateNewLinkGeometry(HashMap<String, Object> map);
    int deleteOldLinkGeometry(HashMap<String, Object> map);
    int updateStationGeometry(HashMap<String, Object> map);
    int updateNodeGeometry(HashMap<String, Object> map);
    // shp 파일 추가
    int insertNewFile(HashMap<String, Object> map);
    // shp 파일 링크 정보 추가

    // shp 파일 링크 포인트 추가

    // shp 파일 노드

}

