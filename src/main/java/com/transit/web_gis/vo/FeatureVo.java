package com.transit.web_gis.vo;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "FEATURE_TABLE")
public class FeatureVo {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "FEATURE_SEQ")
    @SequenceGenerator(name = "FEATURE_SEQ", sequenceName = "FEATURE_SEQ", allocationSize = 1)
    @Column(name = "FEATURE_ID")
    private Long featureId;

    @Column(name = "TYPE")
    private String type;

    @Column(name = "SEQ")
    private int seq;

    @Column(name = "PROPERTIES")
    private String properties;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shp_id")
    private ShpVo shpVo;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "geometry_id", unique = true) // unique 속성으로 일대일 관계를 설정
    private GeometryVo geometryVo;

//    @OneToMany(mappedBy = "featureVo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
//    @BatchSize(size = 10)
//    private List<CoordinateVo> coordinateVos;
}
