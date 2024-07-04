package com.transit.web_gis.service;

import com.transit.web_gis.mapper.BmsMapper;
import com.transit.web_gis.vo.BmsVo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;

@Service
public class BmsService {
    private final BmsMapper bmsMapper;

    public BmsService(BmsMapper bmsMapper) {
        this.bmsMapper = bmsMapper;
    }

    public List<BmsVo> getStation(HashMap<String, Object> map) {
        return bmsMapper.getStation(map);
    }

    public List<BmsVo> getLink(HashMap<String, Object> map) {
        return bmsMapper.getLink(map);
    }

    public List<BmsVo> getNode(HashMap<String, Object> map) {
        return bmsMapper.getNode(map);
    }

    public List<BmsVo> getLinkPointByLinkId(HashMap<String, Object> map) {
        return bmsMapper.getLinkPointByLinkId(map);
    }

    public int updateNewLinkGeometry(HashMap<String, Object> map) { return bmsMapper.updateNewLinkGeometry(map);}

    public int deleteOldLinkGeometry(HashMap<String, Object> map) { return bmsMapper.deleteOldLinkGeometry(map);}

    public int updateStationGeometry(HashMap<String, Object> map) { return bmsMapper.updateStationGeometry(map);}

    public int updateNodeGeometry(HashMap<String, Object> map) { return bmsMapper.updateNodeGeometry(map);}
}
