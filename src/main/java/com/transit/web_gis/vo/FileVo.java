package com.transit.web_gis.vo;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
public class FileVo {
    private String file_id;
    private String file_name;
    private String reg_dt;
}