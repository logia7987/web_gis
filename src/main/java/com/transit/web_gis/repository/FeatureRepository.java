package com.transit.web_gis.repository;

import com.transit.web_gis.vo.FeatureVo;
import com.transit.web_gis.vo.ShpVo;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeatureRepository extends JpaRepository<FeatureVo, Long> {
    List<FeatureVo> findByShpVo(ShpVo shpVo, Sort sort);

}