const LINK_NODE_STATION_SOURCE_ID = 'link-node-station-source';
let linkNodeStationFeatures = {
    type : "FeatureCollection",
    features : []
};
//Feature 좌표 등록 반올림 위치 값 상수 처리
const COORD_ROUND = 6;
function setLinkNodeStationFeature2(x){
    //공통 features 초기화
    linkNodeStationFeatures.features = [];

    //sc파라미터 정의
    let params = {
        sc_NE_LNG : turf.round(map.getBounds()._ne.lng, COORD_ROUND),
        sc_NE_LAT : turf.round(map.getBounds()._ne.lat, COORD_ROUND),
        sc_SW_LNG : turf.round(map.getBounds()._sw.lng, COORD_ROUND),
        sc_SW_LAT : turf.round(map.getBounds()._sw.lat, COORD_ROUND)
    };

    //Station 처리
    if(stationShowFlag === true) {
        params["sc_MODE"] = "S";
        requestAjax("/gis/getGeoJson.bms", params, function(result){
            let geoJson = JSON.parse(result.data);
            for(let feature of geoJson.features){
                //현재 적용된 라벨 설정
                if(stationShowLabel != undefined && stationShowLabel !== "arsId" && stationShowLabel !== "emptyLabel"){
                    feature.properties.label = feature.properties["arsId"] + "\n" + feature.properties[stationShowLabel];
                }else{
                    feature.properties.label = feature.properties[stationShowLabel];
                }

                //정류소 드래그 선택
                if(Object.keys(dragStationFeature).length !== 0 && dragStationFeature.properties.stationId === feature.properties.stationId){
                    dragStationFeature.properties.iconColor = feature.properties.dragIconColor;
                    dragStationFeature.properties.textColor = feature.properties.dragTextColor;
                    feature = dragStationFeature;
                }
                //정류소 검색
                else if(selectedStationId.length > 0 && selectedStationId === feature.properties.stationId){
                    feature.properties.iconColor = feature.properties.selectedIconColor;
                    feature.properties.iconSize = feature.properties.selectedIconSize;
                    feature.properties.textColor = feature.properties.selectedTextColor;
                    feature.properties.textSize = feature.properties.selectedTextSize;
                }
                //경유도로 선택된 정류소 색상처리
                else if(viaStationSelectIds.length > 0){
                    if(viaStationSelectIds.includes(feature.properties.stationId)){
                        feature.properties.iconColor = feature.properties.viaIconColor;
                        feature.properties.textColor = feature.properties.viaTextColor;
                    }
                }

                //링크, 노드, 정류소 공통 features 저장
                linkNodeStationFeatures.features.push(feature);
            }
        });
    }

    //Node 처리
    if(nodeShowFlag === true){
        params["sc_MODE"] = "N";
        requestAjax("/gis/getGeoJson.bms", params, function(result){
            let geoJson = JSON.parse(result.data);
            for(let feature of geoJson.features){
                if(nodeShowLabel != undefined){
                    feature.properties.label = feature.properties[nodeShowLabel];
                }

                if(selectedNodeId.length > 0 && selectedNodeId === feature.properties.nodeId){
                    feature.properties.iconColor = feature.properties.selectedIconColor;
                    feature.properties.iconSize = feature.properties.selectedIconSize;
                    feature.properties.textColor = feature.properties.selectedTextColor;
                    feature.properties.textSize = feature.properties.selectedTextSize;
                }

                linkNodeStationFeatures.features.push(feature);
            }
        });
    }

    //Link 처리
    if(linkShowFlag === true){
        params["sc_MODE"] = "L";
        requestAjax("/gis/getGeoJson.bms", params, function(result){
            let geoJson = JSON.parse(result.data);
            for(let feature of geoJson.features){
                if(linkShowLabel != undefined){
                    feature.properties.label = feature.properties[linkShowLabel];
                }

                if(selectedLinkId.length > 0 && selectedLinkId === feature.properties.linkId){
                    feature.properties.lineColor = feature.properties.selectedLineColor;
                    feature.properties.textColor = feature.properties.selectedTextColor;
                    feature.properties.textSize = feature.properties.selectedTextSize;
                }

                //경유도로 선택된 정류소 색상처리
                if(viaLinkSelectIds.length > 0){
                    if(viaLinkSelectIds.includes(feature.properties.linkId)){
                        feature.properties.lineColor = feature.properties.viaLineColor;
                        feature.properties.textColor = feature.properties.viaTextColor;
                    }
                }

                if(editLinkIds.length > 0){
                    if(editLinkIds.includes(feature.properties.linkId)){
                        feature.properties.lineColor = feature.properties.editLineColor;
                        feature.properties.lineWidth = feature.properties.editLineWidth;
                        feature.properties.lineOpacity = feature.properties.editLineOpacity;
                    }
                }

                //링크 편집모드 상태로 추가 가능한 링크만 색상 처리
                //링크의 경우 라벨은 항상 검정색으로 가야될것같기에 여기서부터는 lineColor만 설정해주고 나중에 위의 로직도
                //텍스트 색상 변경 구간을 빼야될 수도 있다
                if(editLinkSelectIds.length > 0){
                    if(editLinkSelectIds.includes(feature.properties.linkId)){
                        feature.properties.lineColor = feature.properties.editPositiveLineColor;
                        feature.properties.lineWidth = feature.properties.editLineWidth;
                        feature.properties.lineOpacity = feature.properties.editLineOpacity;
                    }
                }

                linkNodeStationFeatures.features.push(feature);
            }
        });
    }

    map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
}