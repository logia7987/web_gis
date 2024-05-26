package com.transit.web_gis.service;

import com.transit.web_gis.repository.GeometryRepository;
import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.GeometryVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class GeometryService {

    @Autowired
    private GeometryRepository geometryRepository;

    public void saveGeometry(GeometryVo geometry) {
        geometryRepository.save(geometry);
    }

    public GeometryVo getGeometryByFeature(FeatureVo featureVo) {
        return geometryRepository.findByFeatureVo(featureVo);
    }
}
