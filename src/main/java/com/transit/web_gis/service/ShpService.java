package com.transit.web_gis.service;

import com.transit.web_gis.repository.FeatureRepository;
import com.transit.web_gis.repository.ShpRepository;
import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.ShpVo;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ShpService {

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private ShpRepository shpRepository;

    @Autowired
    private FeatureRepository featureRepository;

    @Transactional
    public List<ShpVo> selectShp() {
        return shpRepository.findAll(Sort.by(Sort.Direction.DESC, "uploadDate"));
    }

    @Transactional(readOnly = true)
    public ShpVo getShpDataById(Long shpId) {
        ShpVo shpVo = shpRepository.findById(shpId).orElse(null);

        if (shpVo != null) {
            for (FeatureVo featureVo : shpVo.getFeatureVos()) {
//                Hibernate.initialize(featureVo.getCoordinateVos());
            }
        }

        return shpVo;
    }

    public ShpVo getShp(Long shpId) {
        return shpRepository.findById(shpId).orElse(null);
    }
    public ShpVo saveShp(ShpVo shp) {
        ShpVo savedShp = shpRepository.save(shp);
        return savedShp;
    }

}