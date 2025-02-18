package com.transit.web_gis.util;

public class ShapeUtil {
  // Constants
  public static final double PI = Math.PI;
  public static final double EPSLN = 0.0000000001;
  public static final int X_W2B = 128;
  public static final int Y_W2B = -481;
  public static final int Z_W2B = -664;
  public static final int KBESSEL1984 = 0;
  public static final int KWGS84 = 1;
  public static final int KGEOGRAPHIC = 0;
  public static final int KTMWEST = 1;
  public static final int KTMMID = 2;
  public static final int KTMEAST = 3;
  public static final int KKATEC = 4;
  public static final int KUTM52 = 5;
  public static final int KUTM51 = 6;
  // 변환 전 타원체, 좌표계
  private int m_eSrcEllips;
  private int m_eSrcSystem;
  // 변환 후 타원체, 좌표계
  private int m_eDstEllips;
  private int m_eDstSystem;
  // 타원체 요소
  private double[] m_arMajor = new double[] { 6377397.155, 6378137.0 };
  private double[] m_arMinor = new double[] { 6356078.96325, 6356752.3142 };
  // 좌표계 요소
  private double[] m_arScaleFactor = new double[] {
      1, 1, 1, 1, 0.9999, 0.9996, 0.9996
  };
  private double[] m_arLonCenter = new double[] {
      0.0, 2.18171200985643, 2.21661859489632, 2.2515251799362,
      2.23402144255274, 2.25147473507269, 2.14675497995303
  };
  private double[] m_arLatCenter = new double[] {
      0.0, 0.663225115757845, 0.663225115757845, 0.663225115757845,
      0.663225115757845, 0.0, 0.0
  };
  private double[] m_arFalseNorthing = new double[] {
      0.0, 500000.0, 500000.0, 500000.0, 600000.0, 0.0, 0.0
  };
  private double[] m_arFalseEasting = new double[] {
      0.0, 200000.0, 200000.0, 200000.0, 400000.0, 500000.0, 500000.0
  };
  // Internal Value for Tm2Geo
  private double m_dSrcE0;
  private double m_dSrcE1;
  private double m_dSrcE2;
  private double m_dSrcE3;
  private double m_dSrcE;
  private double m_dSrcEs;
  private double m_dSrcEsp;
  private double m_dSrcMl0;
  private double m_dSrcInd;
  // Internal Value for Geo2Tm
  private double m_dDstE0;
  private double m_dDstE1;
  private double m_dDstE2;
  private double m_dDstE3;
  private double m_dDstE;
  private double m_dDstEs;
  private double m_dDstEsp;
  private double m_dDstMl0;
  private double m_dDstInd;
  // Internal Value for DatumTrans
  private double m_dTemp;
  private double m_dEsTemp;
  private int m_iDeltaX;
  private int m_iDeltaY;
  private int m_iDeltaZ;
  private double m_dDeltaA;
  private double m_dDeltaF;
  private double m_dInX = 0.0;
  private double m_dInY = 0.0;
  private double m_dOutX = 0.0;
  private double m_dOutY = 0.0;
  private double m_dInLon = 0.0;
  private double m_dInLat = 0.0;
  private double m_dOutLon = 0.0;
  private double m_dOutLat = 0.0;
  private double m_dTmX = 0.0;
  private double m_dTmY = 0.0;

  public double[] TM2WGS(double lon, double lat) {
    ShapeUtil ct = new ShapeUtil(KBESSEL1984,
        KTMMID,
        KWGS84,
        KGEOGRAPHIC);

    ct.conv(lon, lat);

    return new double[] {
      ct.getRetX(),
      ct.getRetY()
    };
  }

  public double[] WGS2TM(double lon, double lat) {
    ShapeUtil ct = new ShapeUtil(KWGS84,
        KGEOGRAPHIC,
        KBESSEL1984,
        KTMMID);

    ct.conv(lat, lon);

    return new double[] {
      ct.getRetX(),
      ct.getRetY()
    };
  }

  public void conv(double lat, double lon) {
    m_dInX = lon;
    m_dInY = lat;

    // Convert to Radian Geographic
    if (m_eSrcSystem == KGEOGRAPHIC) {
      m_dInLon = D2R(m_dInX);
      m_dInLat = D2R(m_dInY);
    } else {
      // Geographic calculating
      Tm2Geo();
    }

    if (m_eSrcEllips == m_eDstEllips) {
      m_dOutLon = m_dInLon;
      m_dOutLat = m_dInLat;
    } else {
      // Datum transformation using molodensky function
      m_dOutLon = m_dInLon;
      m_dOutLat = m_dInLat;
      DatumTrans();
    }

    // now we should make a output. but it depends on user options
    if (m_eDstSystem == KGEOGRAPHIC) // if output option is latitude & longitude {
    {
      m_dOutX = R2D(m_dOutLon);
      m_dOutY = R2D(m_dOutLat);
    } else // if output option is cartesian systems
    {
      // TM or UTM calculating
      Geo2Tm();
      m_dOutX = m_dTmX;
      m_dOutY = m_dTmY;
    }
  }

  public double getRetX() {
    return m_dOutX;
  }

  public double getRetY() {
    return m_dOutY;
  }

  public ShapeUtil() {
    this(KBESSEL1984, KKATEC, KBESSEL1984, KTMMID); // 티엠으로 변환
  }

  public ShapeUtil(int srcEllips, int srcSystem, int dstEllips,
      int dstSystem) {
    this.m_eSrcEllips = srcEllips;
    this.m_eSrcSystem = srcSystem;
    this.m_eDstEllips = dstEllips;
    this.m_eDstSystem = dstSystem;
    SetSrcType(srcEllips, srcSystem);
    SetDstType(dstEllips, dstSystem);
  }

  private double D2R(double deg) {
    return deg * PI / 180.0;
  }

  private double R2D(double rad) {
    return rad * 180.0 / PI;
  }

  public void convert(int lat, int lon) {
    convert(DMS2DEG(lat), DMS2DEG(lon));
  }

  private static double DMS2DEG(int dms) {
    int dd = dms / 10000;
    int mm = (dms - (dd * 10000)) / 100;
    int ss = dms - (dd * 10000) - (mm * 100);
    return dd + (mm / 60.0) + (ss / 3600.0);
  }

  public static double GPS2DEG(double gps) {
    int dd = (int) (gps / 100);
    int mm = (int) (gps - (dd * 100));
    double ss = gps - (dd * 100) - (mm);
    return dd + (mm / 60.0) + (ss / 60.0);
  }

  public static double DEG2GPS(double dms) {
    int dd = (int) dms;
    int mm = (int) ((dms - dd) * 60);
    double ss = (dms - dd - (mm / 60.0)) * 60;
    return (dd * 100) + mm + ss;
  }

  public void convert(double lat, double lon) {
    m_dInX = lon;
    m_dInY = lat;

    // Convert to Radian Geographic
    if (m_eSrcSystem == KGEOGRAPHIC) {
      // 10.405초 보정
      // m_dInX += 10.405 / 3600;
      m_dInLon = D2R(m_dInX);
      m_dInLat = D2R(m_dInY);
    } else {
      // Geographic calculating
      Tm2Geo();
    }

    if (m_eSrcEllips == m_eDstEllips) {
      m_dOutLon = m_dInLon;
      m_dOutLat = m_dInLat;
    } else {
      // Datum transformation using molodensky function
      m_dOutLon = m_dInLon;
      m_dOutLat = m_dInLat;
      DatumTrans();
    }

    // now we should make a output. but it depends on user options
    if (m_eDstSystem == KGEOGRAPHIC) // if output option is latitude & longitude {
    {
      m_dOutX = R2D(m_dOutLon);
      m_dOutY = R2D(m_dOutLat);
    } else // if output option is cartesian systems
    {
      // TM or UTM calculating
      Geo2Tm();
      m_dOutX = m_dTmX;
      m_dOutY = m_dTmY;
    }
  }

  private double asinz(double value) {

    if (Math.abs(value) > 1.0)
      value = (value > 0 ? 1 : -1);

    return Math.asin(value);
  }

  private void DatumTrans() {
    double dRm;
    double dRn;
    double dDeltaPhi;
    double dDeltaLamda;
    dRm = m_arMajor[m_eSrcEllips] * (1.0 - m_dEsTemp) / Math.pow(1.0 -
        m_dEsTemp * Math.sin(m_dInLat) * Math.sin(m_dInLat),
        1.5);
    dRn = m_arMajor[m_eSrcEllips] / Math.sqrt(1.0 -
        m_dEsTemp * Math.sin(m_dInLat) * Math.sin(m_dInLat));
    dDeltaPhi = ((((-m_iDeltaX * Math.sin(m_dInLat) * Math.cos(m_dInLon) -
        m_iDeltaY * Math.sin(m_dInLat) * Math.sin(m_dInLon)) +
        m_iDeltaZ * Math.cos(m_dInLat)) +
        m_dDeltaA * dRn * m_dEsTemp * Math.sin(m_dInLat) * Math.cos(m_dInLat) / m_arMajor[m_eSrcEllips]) +
        m_dDeltaF * (dRm / m_dTemp + dRn * m_dTemp) * Math.sin(m_dInLat) * Math.cos(m_dInLat)) / dRm;
    dDeltaLamda = (-m_iDeltaX * Math.sin(m_dInLon) +
        m_iDeltaY * Math.cos(m_dInLon)) / (dRn * Math.cos(m_dInLat));
    m_dOutLat = m_dInLat + dDeltaPhi;
    m_dOutLon = m_dInLon + dDeltaLamda;
  }

  // dInX, dInY, dInLon, dInLat
  private void Tm2Geo() {
    double con; // temporary angles
    double phi; // temporary angle
    double delta_Phi; // difference between longitudes
    long i; // counter variable
    double sin_phi; // sin cos and tangent values
    double cos_phi;
    double tan_phi;
    double c; // temporary variables
    double cs;
    double t;
    double ts;
    double n;
    double r;
    double d;
    double ds;
    double f; // temporary variables
    double h;
    double g;
    double temp;
    long max_iter = 6; // maximun number of iterations

    if (m_dSrcInd != 0) {
      f = Math.exp(m_dInX / (m_arMajor[m_eSrcEllips] * m_arScaleFactor[m_eSrcSystem]));
      g = 0.5 * (f - 1.0 / f);
      temp = m_arLatCenter[m_eSrcSystem] +
          m_dInY / (m_arMajor[m_eSrcEllips] * m_arScaleFactor[m_eSrcSystem]);
      h = Math.cos(temp);
      con = Math.sqrt((1.0 - h * h) / (1.0 + g * g));
      m_dInLat = asinz(con);

      if (temp < 0)
        m_dInLat *= -1;

      if ((g == 0) && (h == 0))
        m_dInLon = m_arLonCenter[m_eSrcSystem];
      else
        m_dInLon = Math.atan(g / h) + m_arLonCenter[m_eSrcSystem];
    }

    // TM to LL inverse equations from here
    m_dInX -= m_arFalseEasting[m_eSrcSystem];
    m_dInY -= m_arFalseNorthing[m_eSrcSystem];
    con = (m_dSrcMl0 + m_dInY / m_arScaleFactor[m_eSrcSystem]) / m_arMajor[m_eSrcEllips];
    phi = con;
    i = 0;

    while (true) {
      delta_Phi = ((con + m_dSrcE1 * Math.sin(2.0 * phi) -
          m_dSrcE2 * Math.sin(4.0 * phi) +
          m_dSrcE3 * Math.sin(6.0 * phi)) / m_dSrcE0) -
          phi;
      phi = phi + delta_Phi;

      if (Math.abs(delta_Phi) <= EPSLN)
        break;

      if (i >= max_iter) {
        // egovLogger.error("Latitude failed to converge");
        return;
      }

      i++;
    }

    if (Math.abs(phi) < (PI / 2)) {
      sin_phi = Math.sin(phi);
      cos_phi = Math.cos(phi);
      tan_phi = Math.tan(phi);
      c = m_dSrcEsp * cos_phi * cos_phi;
      cs = c * c;
      t = tan_phi * tan_phi;
      ts = t * t;
      con = 1.0 - m_dSrcEs * sin_phi * sin_phi;
      n = m_arMajor[m_eSrcEllips] / Math.sqrt(con);
      r = n * (1.0 - m_dSrcEs) / con;
      d = m_dInX / (n * m_arScaleFactor[m_eSrcSystem]);
      ds = d * d;
      m_dInLat = phi -
          (n * tan_phi * ds / r) * (0.5 -
              ds / 24.0 * (5.0 + 3.0 * t + 10.0 * c - 4.0 * cs -
                  9.0 * m_dSrcEsp -
                  ds / 30.0 * (61.0 + 90.0 * t + 298.0 * c +
                      45.0 * ts - 252.0 * m_dSrcEsp - 3.0 * cs)));
      m_dInLon = m_arLonCenter[m_eSrcSystem] +
          (d * (1.0 -
              ds / 6.0 * (1.0 + 2.0 * t + c -
                  ds / 20.0 * (5.0 - 2.0 * c + 28.0 * t -
                      3.0 * cs + 8.0 * m_dSrcEsp + 24.0 * ts)))
              / cos_phi);
    } else {
      m_dInLat = PI * 0.5 * Math.sin(m_dInY);
      m_dInLon = m_arLonCenter[m_eSrcSystem];
    }
  }

  private void Geo2Tm() {
    double delta_lon;
    double sin_phi;
    double cos_phi;
    double al;
    double als;
    double b;
    double c;
    double t;
    double tq;
    double con;
    double n;
    double ml;
    // LL to TM Forward equations from here
    delta_lon = m_dOutLon - m_arLonCenter[m_eDstSystem];
    sin_phi = Math.sin(m_dOutLat);
    cos_phi = Math.cos(m_dOutLat);

    if (m_dDstInd != 0) {
      b = cos_phi * Math.sin(delta_lon);

      if ((Math.abs(Math.abs(b) - 1.0)) < 0.0000000001) {
        // egovLogger.error("지정하신 점이 무한대로 갑니다.");
      }
    } else {
      b = 0;
      m_dTmX = 0.5 * m_arMajor[m_eDstEllips] * m_arScaleFactor[m_eDstSystem] * Math.log((1.0 + b) / (1.0 - b));
      con = Math.acos(cos_phi * Math.cos(delta_lon) / Math.sqrt(1.0 -
          b * b));

      if (m_dOutLat < 0) {
        con = -con;
        m_dTmY = m_arMajor[m_eDstEllips] * m_arScaleFactor[m_eDstSystem] * (con -
            m_arLatCenter[m_eDstSystem]);
      }
    }

    al = cos_phi * delta_lon;
    als = al * al;
    c = m_dDstEsp * cos_phi * cos_phi;
    tq = Math.tan(m_dOutLat);
    t = tq * tq;
    con = 1.0 - m_dDstEs * sin_phi * sin_phi;
    n = m_arMajor[m_eDstEllips] / Math.sqrt(con);
    ml = m_arMajor[m_eDstEllips] * mlfn(m_dDstE0, m_dDstE1, m_dDstE2,
        m_dDstE3, m_dOutLat);
    m_dTmX = m_arScaleFactor[m_eDstSystem] * n * al * (1.0 +
        als / 6.0 * (1.0 - t + c +
            als / 20.0 * (5.0 - 18.0 * t + t * t + 72.0 * c -
                58.0 * m_dDstEsp)))
        +
        m_arFalseEasting[m_eDstSystem];
    m_dTmY = m_arScaleFactor[m_eDstSystem] * (ml - m_dDstMl0 +
        n * tq * (als * (0.5 +
            als / 24.0 * (5.0 - t + 9.0 * c + 4.0 * c * c +
                als / 30.0 * (61.0 - 58.0 * t + t * t +
                    600.0 * c - 330.0 * m_dDstEsp)))))
        +
        m_arFalseNorthing[m_eDstSystem];
  }

  private void SetSrcType(int eEllips, int eSystem) {
    m_eSrcEllips = eEllips;
    m_eSrcSystem = eSystem;
    double temp = m_arMinor[m_eSrcEllips] / m_arMajor[m_eSrcEllips];
    m_dSrcEs = 1.0 - temp * temp;
    m_dSrcE = Math.sqrt(m_dSrcEs);
    m_dSrcE0 = e0fn(m_dSrcEs);
    m_dSrcE1 = e1fn(m_dSrcEs);
    m_dSrcE2 = e2fn(m_dSrcEs);
    m_dSrcE3 = e3fn(m_dSrcEs);
    m_dSrcMl0 = m_arMajor[m_eSrcEllips] * mlfn(m_dSrcE0, m_dSrcE1,
        m_dSrcE2, m_dSrcE3,
        m_arLatCenter[m_eSrcSystem]);
    m_dSrcEsp = m_dSrcEs / (1.0 - m_dSrcEs);

    if (m_dSrcEs < 0.00001)
      m_dSrcInd = 1.0;
    else
      m_dSrcInd = 0.0;

    InitDatumVar();
  }

  private void SetDstType(int eEllips, int eSystem) {
    m_eDstEllips = eEllips;
    m_eDstSystem = eSystem;
    double temp = m_arMinor[m_eDstEllips] / m_arMajor[m_eDstEllips];
    m_dDstEs = 1.0 - temp * temp;
    m_dDstE = Math.sqrt(m_dDstEs);
    m_dDstE0 = e0fn(m_dDstEs);
    m_dDstE1 = e1fn(m_dDstEs);
    m_dDstE2 = e2fn(m_dDstEs);
    m_dDstE3 = e3fn(m_dDstEs);
    m_dDstMl0 = m_arMajor[m_eDstEllips] * mlfn(m_dDstE0, m_dDstE1,
        m_dDstE2, m_dDstE3,
        m_arLatCenter[m_eDstSystem]);
    m_dDstEsp = m_dDstEs / (1.0 - m_dDstEs);

    if (m_dDstEs < 0.00001)
      m_dDstInd = 1.0;
    else
      m_dDstInd = 0.0;

    InitDatumVar();
  }

  private double e0fn(double x) {
    return 1.0 - 0.25 * x * (1.0 + x / 16.0 * (3.0 + 1.25 * x));
  }

  private double e1fn(double x) {
    return 0.375 * x * (1.0 + 0.25 * x * (1.0 + 0.46875 * x));
  }

  private double e2fn(double x) {
    return 0.05859375 * x * x * (1.0 + 0.75 * x);
  }

  private double e3fn(double x) {
    return x * x * x * (35.0 / 3072.0);
  }

  private double e4fn(double x) {
    double con;
    double com;
    con = 1.0 + x;
    com = 1.0 - x;
    return Math.sqrt(Math.pow(con, con) * Math.pow(com, com));
  }

  private double mlfn(double e0, double e1, double e2, double e3, double phi) {
    return e0 * phi - e1 * Math.sin(2.0 * phi) +
        e2 * Math.sin(4.0 * phi) - e3 * Math.sin(6.0 * phi);
  }

  private void InitDatumVar() {
    int iDefFact;
    double dF;
    iDefFact = m_eSrcEllips - m_eDstEllips;
    m_iDeltaX = iDefFact * X_W2B;
    m_iDeltaY = iDefFact * Y_W2B;
    m_iDeltaZ = iDefFact * Z_W2B;
    m_dTemp = m_arMinor[m_eSrcEllips] / m_arMajor[m_eSrcEllips];
    dF = 1.0 - m_dTemp; // flattening
    m_dEsTemp = 1.0 - m_dTemp * m_dTemp; // e2
    m_dDeltaA = m_arMajor[m_eDstEllips] - m_arMajor[m_eSrcEllips]; // output major axis - input major axis
    m_dDeltaF = m_arMinor[m_eSrcEllips] / m_arMajor[m_eSrcEllips] -
        m_arMinor[m_eDstEllips] / m_arMajor[m_eDstEllips]; // Output Flattening - input flattening
  }
}
