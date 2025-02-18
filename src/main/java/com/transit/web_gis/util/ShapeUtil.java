package com.transit.web_gis.util;

public class ShapeUtil {
  // 좌표계 상수
  public static final int BESSEL = 0; // 한국 베셀 타원체
  public static final int WGS84 = 1; // 세계 측지계
  public static final int GEO = 0; // 경위도 좌표계
  public static final int TM_MID = 2; // TM 중부원점

  // 타원체 정보
  private static final double[] MAJOR = new double[] { 6377397.155, 6378137.0 }; // Bessel, WGS84
  private static final double[] MINOR = new double[] { 6356078.96325, 6356752.3142 };

  // TM 투영 파라미터
  private static final double[] SCALE_FACTOR = new double[] { 1, 1, 1, 1, 0.9999, 0.9996, 0.9996 };
  private static final double[] LON_CENTER = new double[] {
      0.0, 2.18171200985643, 2.21661859489632, 2.2515251799362,
      2.23402144255274, 2.25147473507269, 2.14675497995303
  };
  private static final double[] LAT_CENTER = new double[] {
      0.0, 0.663225115757845, 0.663225115757845, 0.663225115757845,
      0.663225115757845, 0.0, 0.0
  };
  private static final double[] FALSE_NORTHING = new double[] {
      0.0, 500000.0, 500000.0, 500000.0, 600000.0, 0.0, 0.0
  };
  private static final double[] FALSE_EASTING = new double[] {
      0.0, 200000.0, 200000.0, 200000.0, 400000.0, 500000.0, 500000.0
  };

  // Datum 변환 상수
  private static final int X_W2B = 128;
  private static final int Y_W2B = -481;
  private static final int Z_W2B = -664;

  private static final double PI = Math.PI;
  private static final double EPSLN = 0.0000000001;

  /**
   * TM 좌표를 WGS84 경위도로 변환
   * 
   * @param x TM X좌표 (Easting)
   * @param y TM Y좌표 (Northing)
   * @return double[] {경도, 위도}
   */
  public static double[] tm2wgs(double x, double y) {
    CoordinateConverter converter = new CoordinateConverter(BESSEL, TM_MID, WGS84, GEO);
    converter.conv(x, y);
    return new double[] { converter.getOutX(), converter.getOutY() };
  }

  /**
   * WGS84 경위도를 TM 좌표로 변환
   * 
   * @param lon 경도
   * @param lat 위도
   * @return double[] {X좌표, Y좌표}
   */
  public static double[] wgs2tm(double lon, double lat) {
    CoordinateConverter converter = new CoordinateConverter(WGS84, GEO, BESSEL, TM_MID);
    converter.conv(lat, lon); // 주의: 위도, 경도 순서로 입력
    return new double[] { converter.getOutX(), converter.getOutY() };
  }

  private static class CoordinateConverter {
    private final int srcEllips;
    private final int srcSystem;
    private final int dstEllips;
    private final int dstSystem;

    // 변환에 필요한 파라미터들
    private double srcE0, srcE1, srcE2, srcE3, srcEs, srcE, srcEsp, srcMl0, srcInd;
    private double dstE0, dstE1, dstE2, dstE3, dstEs, dstE, dstEsp, dstMl0, dstInd;
    private double inX, inY, inLon, inLat, outLon, outLat, outX, outY, tmX, tmY;

    // Datum 변환 관련 변수
    private double temp;
    private double esTemp;
    private double deltaA;
    private double deltaF;

    public CoordinateConverter() {
      this(BESSEL, TM_MID, WGS84, GEO); // 기본 생성자: TM -> WGS84 변환
    }

    public CoordinateConverter(int srcEllips, int srcSystem, int dstEllips, int dstSystem) {
      this.srcEllips = srcEllips;
      this.srcSystem = srcSystem;
      this.dstEllips = dstEllips;
      this.dstSystem = dstSystem;
    }

    private void setSrcType() {
      double temp = MINOR[srcEllips] / MAJOR[srcEllips];
      srcEs = 1.0 - temp * temp;
      srcE = Math.sqrt(srcEs);
      srcE0 = e0fn(srcEs);
      srcE1 = e1fn(srcEs);
      srcE2 = e2fn(srcEs);
      srcE3 = e3fn(srcEs);
      srcMl0 = MAJOR[srcEllips] * mlfn(srcE0, srcE1, srcE2, srcE3,
          LAT_CENTER[srcSystem]);
      srcEsp = srcEs / (1.0 - srcEs);
      srcInd = (srcEs < 0.00001) ? 1.0 : 0.0;
      initDatumVars();
    }

    private void setDstType() {
      double temp = MINOR[dstEllips] / MAJOR[dstEllips];
      dstEs = 1.0 - temp * temp;
      dstE = Math.sqrt(dstEs);
      dstE0 = e0fn(dstEs);
      dstE1 = e1fn(dstEs);
      dstE2 = e2fn(dstEs);
      dstE3 = e3fn(dstEs);
      dstMl0 = MAJOR[dstEllips] * mlfn(dstE0, dstE1, dstE2, dstE3,
          LAT_CENTER[dstSystem]);
      dstEsp = dstEs / (1.0 - dstEs);
      dstInd = (dstEs < 0.00001) ? 1.0 : 0.0;
    }

    private void initDatumVars() {
      temp = MINOR[srcEllips] / MAJOR[srcEllips];
      esTemp = 1.0 - temp * temp;
      deltaA = MAJOR[dstEllips] - MAJOR[srcEllips];
      deltaF = MINOR[srcEllips] / MAJOR[srcEllips] -
          MINOR[dstEllips] / MAJOR[dstEllips];
    }

    public void conv(double x, double y) {
      inX = x;
      inY = y;

      if (srcSystem == GEO) {
        inLon = Math.toRadians(inX);
        inLat = Math.toRadians(inY);
      } else {
        tm2geo();
      }

      if (srcEllips != dstEllips) {
        datumTrans();
      } else {
        outLon = inLon;
        outLat = inLat;
      }

      if (dstSystem == GEO) {
        outX = Math.toDegrees(outLon);
        outY = Math.toDegrees(outLat);
      } else {
        geo2tm();
        outX = tmX;
        outY = tmY;
      }
    }

    public double getOutX() {
      return outX;
    }

    public double getOutY() {
      return outY;
    }

    private void tm2geo() {
      double con, phi, delta_phi;
      double sin_phi, cos_phi, tan_phi;
      double c, cs, t, ts, n, r, d, ds;
      double f, h, g, temp;
      int maxIter = 6;

      if (srcInd != 0) {
          f = Math.exp(inX / (MAJOR[srcEllips] * SCALE_FACTOR[srcSystem]));
          g = 0.5 * (f - 1.0 / f);
          temp = LAT_CENTER[srcSystem] + inY / (MAJOR[srcEllips] * SCALE_FACTOR[srcSystem]);
          h = Math.cos(temp);
          con = Math.sqrt((1.0 - h * h) / (1.0 + g * g));
          inLat = asinz(con);

          if (temp < 0) inLat *= -1;

          if ((g == 0) && (h == 0)) {
              inLon = LON_CENTER[srcSystem];
          } else {
              inLon = Math.atan(g / h) + LON_CENTER[srcSystem];
          }
      }

      inX -= FALSE_EASTING[srcSystem];
      inY -= FALSE_NORTHING[srcSystem];
      
      con = (srcMl0 + inY / SCALE_FACTOR[srcSystem]) / MAJOR[srcEllips];
      phi = con;

      for (int i = 0; i < maxIter; i++) {
          delta_phi = ((con + srcE1 * Math.sin(2.0 * phi) - 
                   srcE2 * Math.sin(4.0 * phi) + 
                   srcE3 * Math.sin(6.0 * phi)) / srcE0) - phi;
          phi += delta_phi;
          if (Math.abs(delta_phi) <= EPSLN) break;
      }

      if (Math.abs(phi) < (PI / 2)) {
          sin_phi = Math.sin(phi);
          cos_phi = Math.cos(phi);
          tan_phi = Math.tan(phi);
          c = srcEsp * cos_phi * cos_phi;
          cs = c * c;
          t = tan_phi * tan_phi;
          ts = t * t;
          con = 1.0 - srcEs * sin_phi * sin_phi;
          n = MAJOR[srcEllips] / Math.sqrt(con);
          r = n * (1.0 - srcEs) / con;
          d = inX / (n * SCALE_FACTOR[srcSystem]);
          ds = d * d;

          inLat = phi - (n * tan_phi * ds / r) * (0.5 - 
                  ds / 24.0 * (5.0 + 3.0 * t + 10.0 * c - 4.0 * cs - 
                  9.0 * srcEsp - ds / 30.0 * (61.0 + 90.0 * t + 298.0 * c + 
                  45.0 * ts - 252.0 * srcEsp - 3.0 * cs)));

          inLon = LON_CENTER[srcSystem] + (d * (1.0 - 
                  ds / 6.0 * (1.0 + 2.0 * t + c - 
                  ds / 20.0 * (5.0 - 2.0 * c + 28.0 * t - 
                  3.0 * cs + 8.0 * srcEsp + 24.0 * ts))) / cos_phi);
      } else {
          inLat = PI * 0.5 * Math.signum(inY);
          inLon = LON_CENTER[srcSystem];
      }
    }

    private void geo2tm() {
      double deltaLon;
      double sinPhi = Math.sin(outLat);
      double cosPhi = Math.cos(outLat);
      double tanPhi = Math.tan(outLat);

      deltaLon = outLon - LON_CENTER[dstSystem];

      double c = dstEsp * cosPhi * cosPhi;
      double cs = c * c;
      double t = tanPhi * tanPhi;
      double ts = t * t;
      double con = 1.0 - dstEs * sinPhi * sinPhi;
      double n = MAJOR[dstEllips] / Math.sqrt(con);
      double r = n * (1.0 - dstEs) / con;
      double d = deltaLon * cosPhi;
      double ds = d * d;

      tmX = SCALE_FACTOR[dstSystem] * n * d * (1.0 +
          ds / 6.0 * (1.0 - t + c +
              ds / 20.0 * (5.0 - 18.0 * t + ts + 14.0 * c - 58.0 * t * c)))
          +
          FALSE_EASTING[dstSystem];

      double ml = MAJOR[dstEllips] * mlfn(dstE0, dstE1, dstE2, dstE3, outLat);
      tmY = SCALE_FACTOR[dstSystem] * (ml - dstMl0 +
          n * tanPhi * ds * (0.5 +
              ds / 24.0 * (5.0 - t + 9.0 * c + 4.0 * cs +
                  ds / 30.0 * (61.0 - 58.0 * t + ts + 270.0 * c - 330.0 * t * c))))
          +
          FALSE_NORTHING[dstSystem];
    }

    private void datumTrans() {
      // Molodensky 변환
      double rm = MAJOR[srcEllips] * (1.0 - esTemp) /
          Math.pow(1.0 - esTemp * Math.sin(inLat) * Math.sin(inLat), 1.5);
      double rn = MAJOR[srcEllips] /
          Math.sqrt(1.0 - esTemp * Math.sin(inLat) * Math.sin(inLat));

      // 위도 변화량
      double deltaPhi = (((-X_W2B * Math.sin(inLat) * Math.cos(inLon) -
          Y_W2B * Math.sin(inLat) * Math.sin(inLon)) +
          Z_W2B * Math.cos(inLat)) +
          deltaA * rn * esTemp * Math.sin(inLat) * Math.cos(inLat) / MAJOR[srcEllips]) +
          deltaF * (rm / temp + rn * temp) * Math.sin(inLat) * Math.cos(inLat);

      // 경도 변화량
      double deltaLamda = (-X_W2B * Math.sin(inLon) +
          Y_W2B * Math.cos(inLon)) / (rn * Math.cos(inLat));

      // 변환된 좌표 계산
      outLat = inLat + deltaPhi;
      outLon = inLon + deltaLamda;
    }

    // 타원체 계산 지원 함수들
    private static double e0fn(double x) {
      return 1.0 - 0.25 * x * (1.0 + x / 16.0 * (3.0 + 1.25 * x));
    }

    private static double e1fn(double x) {
      return 0.375 * x * (1.0 + 0.25 * x * (1.0 + 0.46875 * x));
    }

    private static double e2fn(double x) {
      return 0.05859375 * x * x * (1.0 + 0.75 * x);
    }

    private static double e3fn(double x) {
      return x * x * x * (35.0 / 3072.0);
    }

    private static double mlfn(double e0, double e1, double e2, double e3, double phi) {
      return e0 * phi - e1 * Math.sin(2.0 * phi) +
          e2 * Math.sin(4.0 * phi) - e3 * Math.sin(6.0 * phi);
    }

    private static double asinz(double value) {
      if (Math.abs(value) > 1.0) {
        value = (value > 0 ? 1 : -1);
      }
      return Math.asin(value);
    }

    // 좌표계 변환을 위한 유틸리티 메서드들
    private static double D2R(double deg) {
      return deg * PI / 180.0;
    }

    private static double R2D(double rad) {
      return rad * 180.0 / PI;
    }

    private static double GPS2DEG(double gps) {
      int dd = (int) (gps / 100);
      int mm = (int) (gps - (dd * 100));
      double ss = gps - (dd * 100) - mm;
      return dd + (mm / 60.0) + (ss / 60.0);
    }

    private static double DEG2GPS(double deg) {
      int dd = (int) deg;
      int mm = (int) ((deg - dd) * 60);
      double ss = (deg - dd - (mm / 60.0)) * 60;
      return (dd * 100) + mm + ss;
    }
  }
}
