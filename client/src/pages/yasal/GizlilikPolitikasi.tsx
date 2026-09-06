import { Link } from "react-router-dom"
import { Bolum, Liste, YasalMetin } from "@/pages/yasal/YasalMetin"

/**
 * Gizlilik politikası. KVKK aydınlatma metninden farkı: o hukuki bildirim, bu ise sistemin
 * gizlilik açısından nasıl davrandığının düz anlatımı — kimin neyi görebildiği, çerez kullanılıp
 * kullanılmadığı, verinin nerede tutulduğu.
 */
export default function GizlilikPolitikasiPage() {
  return (
    <YasalMetin ustBaslik="Gizlilik" baslik="Gizlilik Politikası" guncellemeTarihi="6 Eylül 2026">
      <Bolum baslik="Bu platform ne yapar">
        <p>
          T3VentureOS, T3 Vakfı girişimcilik ekosistemindeki girişimlerin profillerini, finansal
          verilerini ve program katılımlarını tek yerde toplayan kurumsal bir yönetim sistemidir.
          Herkese açık bir sosyal platform değildir; erişim davet edilen kullanıcılarla sınırlıdır.
        </p>
      </Bolum>

      <Bolum baslik="Verinizi kim görebilir">
        <p>Erişim rolünüze göre sınırlanır:</p>
        <Liste
          ogeler={[
            <>
              <strong>Girişim temsilcisi</strong> yalnızca kendi girişiminin verisini görür ve
              düzenler. Başka bir girişimin kayıtlarına erişemez.
            </>,
            <>
              <strong>Program yöneticisi</strong> girişimleri ve programları görüntüler, kayıtlara
              öneri bırakır; onay/red kararı veremez.
            </>,
            <>
              <strong>SuperAdmin</strong> tüm girişimleri, kullanıcıları ve onay kararlarını yönetir.
            </>,
          ]}
        />
        <p>
          Yönetici hesaplarının yaptığı kritik işlemler (onay kararları, rol değişiklikleri, kullanıcı
          yönetimi) İşlem Geçmişi'ne kaydedilir ve geriye dönük denetlenebilir.
        </p>
      </Bolum>

      <Bolum baslik="Çerezler">
        <p>
          <strong>Bu platform çerez kullanmaz.</strong> Oturumunuz, giriş yaptığınızda tarayıcınızın
          yerel deposunda (localStorage) tutulan bir erişim jetonu ile sürdürülür. Bu jeton yalnızca
          kendi tarayıcınızda kalır, üçüncü taraflarla paylaşılmaz ve reklam ya da izleme amacıyla
          kullanılmaz. Çıkış yaptığınızda silinir.
        </p>
        <p>
          Platformda üçüncü taraf analiz, reklam veya izleme aracı bulunmamaktadır.
        </p>
      </Bolum>

      <Bolum baslik="Yapay zekâ kullanımı">
        <p>
          Analiz ve sunum üretimi özellikleri Google Gemini API üzerinden çalışır ve yalnızca siz bir
          analiz ya da sunum talep ettiğinizde devreye girer. Gönderilen veri, ilgili girişimin
          profili ile <strong>onaylanmış</strong> finansal ve istihdam kayıtlarıyla sınırlıdır.
        </p>
        <p>
          Üretilen metinler sistemde saklanır ve girişim temsilcisi tarafından elle düzenlenebilir.
          Yapay zekâ çıktıları bilgi amaçlıdır; onay, değerleme veya yatırım kararı yerine geçmez.
        </p>
      </Bolum>

      <Bolum baslik="Sunum paylaşımı">
        <p>
          Girişim temsilcisi sunumunu platform dışına açan bir bağlantı üretebilir. Bu bağlantıya
          sahip olan herkes — sisteme kayıtlı olmasa bile — sunum içeriğini ve girişimin künyesini
          görebilir. Bu nedenle:
        </p>
        <Liste
          ogeler={[
            "Her bağlantının zorunlu bir son kullanma tarihi vardır; süresiz bağlantı üretilemez.",
            "Bağlantı istenildiği an iptal edilebilir; iptalden sonra açılamaz.",
            "Bağlantının kaç kez açıldığı girişim temsilcisine gösterilir.",
            "Ciro, yatırım, istihdam kayıtları ve onay durumları bu bağlantı üzerinden paylaşılmaz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Güvenlik">
        <Liste
          ogeler={[
            "Parolalar geri döndürülemez biçimde özetlenerek saklanır; hiçbir yerde açık metin olarak tutulmaz.",
            "Ardışık başarısız giriş denemelerinde hesap geçici olarak kilitlenir.",
            "Her uç nokta rol bazlı yetkilendirmeden geçer; girişim temsilcileri yalnızca kendi girişimlerinin kayıtlarına erişebilir.",
            "Paylaşım bağlantıları tahmin edilemeyecek uzunlukta rastgele üretilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Verileriniz üzerindeki denetiminiz">
        <p>
          <strong>Hesabım</strong> bölümünden verilerinizi dışa aktarabilir ve hesap silme talebi
          oluşturabilirsiniz. Silme talebiniz onaylandığında hesabınız anonimleştirilir; gerekçesi ve
          kapsamı{" "}
          <Link to="/kvkk" className="text-t3-blue hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          'nde açıklanmıştır.
        </p>
      </Bolum>
    </YasalMetin>
  )
}
