function getProperties() {
    var info = newProperty[fileNm]
    var html = ""
    var html2 = ""
    var title = Object.keys(info)
    var titArr = []

    if (title.length > 0) {
        $(".property-tit").empty();
        $(".property-detail").empty()
    }

    for (var i = 0; i < title.length; i++) {
        var tit = title[i]
        html = "<th class='prop-tit'>" + title[i] + "</th>"
        $(".property-tit").append(html)
        titArr.push(tit)
    }

    for (j = 0; j < dataArr[fileNm].data.features.length; j++) {
        detail = "<tr>"
        for (k = 0; k < titArr.length; k++) {
            html2 = titArr[k].toString()
            proprty = "<td title="+dataArr[fileNm].data.features[j].properties[html2]+">" +dataArr[fileNm].data.features[j].properties[html2] + "</td>";
            detail += proprty;
        }
        detail += "</tr>"
        $(".property-detail").append(detail)
    }
}

function selectedProperty(obj) {
    if (map.getLayoutProperty('polygons_'+fileNm, 'visibility') === 'none') {
        alert("선택하신 레이어가 지도에 없습니다")
    } else {
        var property = "";
        var id = obj.querySelector('.info-id').textContent;
        var info = dataArr[fileNm].data.features
        $(obj).parent().addClass("selected")
        for (i = 0; i < info.length; i++) {
            if (info[i].properties.DIST1_ID === id) {
                property = info[i]
            }
        }
        editShp(property)
    }
}

function changeProperties(id) {
    changeProper = id
    $(".modal-body form").remove()
    var html =
        "<form method='POST'><label> ID  </label><input id ='proper-dist1id' type='text' value= "+$("#"+id+" .info-id").text()+"><br>"+
        "<label> 지역 코드 </label><input id ='proper-gcode' type='text' value= "+$("#"+id+" .info-gcode").text()+"><br>"+
        "<label> 시군구 </label><input id ='proper-name' type='text' value= "+$("#"+id+" .info-name").text()+"><br>"+
        "<label> 지역명 </label><input id ='proper-fname' type='text' value= "+$("#"+id+" .info-fname").text()+"></div></form>"
    $(".modal-body").append(html)
}

function finishProperties() {
    var data = dataArr[fileNm].data.features
    for (i = 0; i < data.length; i++) {
        if (data[i].id == changeProper) {
            data[i].properties["DIST1_ID"] = $('#proper-dist1id').val()
            data[i].properties["GCODE"] = $('#proper-gcode').val()
            data[i].properties["F_NAME"] = $('#proper-name').val()
            data[i].properties["NAME"] = $('#proper-fname').val()
            $("#"+changeProper+" .info-id").text($('#proper-dist1id').val())
            $("#"+changeProper+" .info-gcode").text($('#proper-gcode').val())
            $("#"+changeProper+" .info-name").text($('#proper-name').val())
            $("#"+changeProper+" .info-fname").text($('#proper-fname').val())
        }
    }
}

function displayLabel() {
    var label = $('#label-list').val()
    var labels = $('#label-list option')

    for (i = 0; i < labels.length; i++) {
        if (map.getLayer(labels[i].value)) {
            map.removeLayer(labels[i].value);
        }
    }

    map.addLayer({
        'id' : label,
        'type' : 'symbol',
        'source' : "data_"+fileNm,
        'layout' : {
            'text-field': ['get', label],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
        }
    })
}