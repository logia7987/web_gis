package com.transit.web_gis.repository;

import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.GeometryVo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GeometryRepository extends JpaRepository<GeometryVo, Long> {

    GeometryVo findByFeatureVo(FeatureVo featureVo);

}