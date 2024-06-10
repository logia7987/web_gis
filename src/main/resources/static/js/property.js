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

    var detail = "";
    for (j = 0; j < dataArr[fileNm].data.features.length; j++) {
        detail = "<tr>"
        for (k = 0; k < titArr.length; k++) {
            html2 = titArr[k].toString()
            proprty = "<tr><td title="+dataArr[fileNm].data.features[j].properties[html2]+">" +dataArr[fileNm].data.features[j].properties[html2] + "</td></tr>";
            detail += proprty;
        }
        detail += "</tr>"
        $(".property-detail").empty().append(detail)
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

function changeProperties() {
    if ($('.change-btn').text() === '수정') {
        $('.change-btn').text('완료')
        $('.property-list table tr').each(function() {
            var cell = $(this).find('.property-info'); // tr 안에 .property-info 찾는다
            var val = valueCell.text(); // .property-info의 텍스트 가지고 온다
            cell.html('<input style="width: 120px" type="text" value="' + val + '" />'); // value 값으로 텍스트 필드 생성
        });
    } else {
        $('.change-btn').text('수정')
        var changedProperty = $('.property-info input').val()
        $('.property-info').empty()
        $('.property-info').text(changedProperty)
        var geoData = map.getSource('data_DISTRICT1_Project')._options.data.features

        for (i = 0; i < geoData.length; i++) {

        }
    }
}

