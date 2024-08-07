package com.transit.web_gis.vo;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Cacheable
@Entity
@Data
@Table(name = "SHP_TABLE")
public class ShpVo {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "SHP_SEQ")
    @SequenceGenerator(name = "SHP_SEQ", sequenceName = "SHP_SEQ", allocationSize = 1)
    @Column(name = "SHP_ID")
    private Long shpId;

    @Column(name = "SHP_NAME")
    private String shpName;

    @Column(name = "UPLOAD_DATE")
    @CreatedDate
    private String uploadDate;

    @OneToMany(mappedBy = "shpVo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeatureVo> featureVos;

    @PrePersist
    public void prePersist() {
        uploadDate = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM.dd HH:mm:ss"));
    }

    private String table_name;
    private String shpType;
}
