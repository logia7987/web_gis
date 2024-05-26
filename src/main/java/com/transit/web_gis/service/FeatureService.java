package com.transit.web_gis.service;

import com.transit.web_gis.repository.FeatureRepository;
import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.ShpVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FeatureService {

    @Autowired
    private FeatureRepository featureRepository;

    public FeatureVo saveFeature(FeatureVo feature) {
        return featureRepository.save(feature);
    }

    public List<FeatureVo> getFeatures(ShpVo shpVo) {
        Sort sort = Sort.by(Sort.Direction.ASC, "seq");

        return featureRepository.findByShpVo(shpVo, sort);
    }
}