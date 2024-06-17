package com.transit.web_gis.controller;

import com.transit.web_gis.service.ShpService;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@Controller
public class MainController {

    @Value("${mapbox.accessToken}")
    private String mapboxAccessToken;

    @Autowired
    private ShpService shpService;

    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");

    @GetMapping("/")
    public String mainView(Model model) {
        String csrfToke;
        try {
            String url = "http://115.88.124.254:9090/"; // 상대방 페이지 URL
            Document doc = Jsoup.connect(url).get();

            // CSRF 토큰을 가진 input 요소를 찾습니다 (아이디가 "csrf"인 예시)
            Element csrfInput = doc.select("input#csrf").first();

            if (csrfInput != null) {
                String csrfToken = csrfInput.attr("value");

                System.out.println("추출된 CSRF 토큰 값: " + csrfToken);

                model.addAttribute("csrf", csrfToken);
            } else {
                System.out.println("CSRF 토큰을 찾을 수 없습니다.");
            }

        } catch (IOException e) {
            e.printStackTrace();
        }

        model.addAttribute("mapboxAccessToken", mapboxAccessToken);
        model.addAttribute("shpList", shpService.selectShp());
        return "html/main/index";
    }

    @GetMapping("/popup/uploadPage")
    public String popupUpload(Model model, HttpSession session) throws IOException {

        // 세션에서 파일 경로 가져오기
        String jsonFilePath = (String) session.getAttribute("jsonFilePath");
        String fileName = (String) session.getAttribute("fileName");

        if (jsonFilePath != null) {
            File jsonFile = new File(jsonFilePath);
            try (FileReader reader = new FileReader(jsonFile)) {
                JSONParser parser = new JSONParser();
                JSONObject resultObj = new JSONObject();
                JSONObject jsonObj = (JSONObject) parser.parse(reader);

                resultObj.put("data", jsonObj);
                resultObj.put("fileName", fileName);

                model.addAttribute("jsonData", resultObj);
            } catch (IOException | ParseException e) {
                e.printStackTrace();
                model.addAttribute("error", "JSON 파일 읽기 중 오류 발생");
            }

            // 세션에서 파일 경로 제거 (필요에 따라)
            session.removeAttribute("jsonFilePath");
            session.removeAttribute("fileName");
            FileUtils.deleteDirectory(tempDir);
        }
        return "html/popup/modal_loadfile";
    }

}
