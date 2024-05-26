package com.transit.web_gis.vo;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "GEOMETRY_TABLE")
public class GeometryVo {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "GEOMETRY_SEQ")
    @SequenceGenerator(name = "GEOMETRY_SEQ", sequenceName = "GEOMETRY_SEQ", allocationSize = 1)
    @Column(name = "GEOMETRY_ID")
    private Long geometryId;

    @Column(name = "TYPE")
    private String type;

    @Lob
    @Column(name = "COORDINATES")
    private String coordinates;

    @OneToOne
    @JoinColumn(name = "feature_id")
    private FeatureVo featureVo;
}
