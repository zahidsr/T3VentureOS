import { Bolum, Liste, YasalMetin } from "@/pages/yasal/YasalMetin"

/**
 * KVKK 10. madde kapsamında aydınlatma metni. İçerik sistemin gerçekte işlediği verilere göre
 * yazıldı: hangi alanların tutulduğu, hesap silmenin neden anonimleştirme olduğu ve AI analizleri
 * için yurt dışına aktarım yapıldığı dahil.
 */
export default function KvkkAydinlatmaPage() {
  return (
    <YasalMetin
      ustBaslik="KVKK"
      baslik="Kişisel Verilerin Korunması Aydınlatma Metni"
      guncellemeTarihi="6 Eylül 2026"
    >
      <Bolum baslik="1. Veri Sorumlusu">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri
          sorumlusu sıfatıyla <strong>[T3 Vakfı — tam ticari unvan]</strong> tarafından aşağıda
          açıklanan kapsamda işlenmektedir.
        </p>
        <p>
          Adres: <strong>[kurum adresi]</strong> · E-posta: <strong>[kvkk@kurum.org]</strong>
        </p>
      </Bolum>

      <Bolum baslik="2. İşlenen Kişisel Veriler">
        <p>Platform, rolünüze göre aşağıdaki verileri işler:</p>
        <Liste
          ogeler={[
            <>
              <strong>Kimlik ve iletişim:</strong> ad soyad, e-posta adresi. Girişim iletişim
              muhatabı olarak kaydedilen kişiler için ayrıca unvan, telefon ve LinkedIn adresi.
            </>,
            <>
              <strong>İşlem güvenliği:</strong> parolanızın geri döndürülemez özeti (PBKDF2-HMAC-SHA256),
              son giriş zamanı, başarısız giriş denemesi sayısı ve hesap kilitlenme bilgisi.
            </>,
            <>
              <strong>Kullanım kayıtları:</strong> onay/red kararları, profil güncelleme talepleri ve
              yönetim işlemleri, işlemi yapan kullanıcı bilgisiyle birlikte İşlem Geçmişi'nde tutulur.
            </>,
            <>
              <strong>Girişim verileri:</strong> ciro, ihracat, yatırım, istihdam ve başarı kayıtları.
              Bunlar kural olarak girişime ait ticari verilerdir; iletişim muhatabı bilgisi yoluyla
              kişisel veriyle ilişkilenebilir.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. İşleme Amaçları ve Hukuki Sebep">
        <Liste
          ogeler={[
            "Platform hesabınızın oluşturulması, kimlik doğrulama ve rol bazlı yetkilendirme",
            "Girişim profillerinin, program katılımlarının ve veri kayıtlarının yönetilmesi",
            "Girişimlerin gönderdiği kayıtların onay süreçlerinin yürütülmesi",
            "Ekosistem düzeyinde raporlama ve etki ölçümü",
            "Hesap güvenliğinin sağlanması ve yetkisiz erişimin önlenmesi",
          ]}
        />
        <p>
          Bu işleme faaliyetleri KVKK m.5/2-(c) (sözleşmenin kurulması veya ifasıyla doğrudan
          ilgili olması) ve m.5/2-(f) (veri sorumlusunun meşru menfaati) hukuki sebeplerine
          dayanmaktadır. Veriler yalnızca elektronik ortamda, platformun kendisi üzerinden toplanır.
        </p>
      </Bolum>

      <Bolum baslik="4. Yurt Dışına Aktarım">
        <p>
          Platformdaki yapay zekâ destekli analiz ve sunum üretimi özellikleri{" "}
          <strong>Google LLC tarafından sağlanan Gemini API</strong> hizmeti üzerinden çalışır. Bu
          özellikler kullanıldığında girişime ait profil bilgileri, onaylanmış finansal veriler ve
          varsa iletişim muhatabının adı ile unvanı hizmet sağlayıcının yurt dışındaki sunucularına
          aktarılır.
        </p>
        <Liste
          ogeler={[
            "Aktarım yalnızca bir analiz veya sunum üretimi talep edildiğinde gerçekleşir; arka planda kendiliğinden veri gönderilmez.",
            "Onay bekleyen (doğrulanmamış) kayıtlar bu aktarıma dahil edilmez.",
            "Parola özetleri, e-posta adresleri ve işlem geçmişi kayıtları hiçbir koşulda aktarılmaz.",
          ]}
        />
        <p>
          Bu aktarımın KVKK m.9 kapsamındaki hukuki dayanağı (açık rıza, standart sözleşme veya
          yeterlilik kararı) <strong>[kurum tarafından belirlenmelidir]</strong>.
        </p>
      </Bolum>

      <Bolum baslik="5. Paylaşım Bağlantıları">
        <p>
          Girişim temsilcileri, hazırladıkları sunumu platform dışından erişilebilir bir bağlantıyla
          paylaşabilir. Bağlantı oluşturulduğunda sunum içeriği ve girişimin künyesi — iletişim
          muhatabının adı, unvanı ve e-postası dahil — bağlantıya sahip herkese açık hâle gelir.
          Bağlantılar zorunlu olarak süre sınırlıdır ve girişim temsilcisi tarafından her an iptal
          edilebilir. Finansal kayıtlar bu bağlantılar üzerinden paylaşılmaz.
        </p>
      </Bolum>

      <Bolum baslik="6. Saklama Süresi ve Silme">
        <p>
          Kişisel verileriniz, platform üyeliğiniz sürdüğü müddetçe ve ilgili mevzuatın öngördüğü
          zamanaşımı süreleri boyunca saklanır.
        </p>
        <p>
          Hesap silme talebiniz onaylandığında hesabınız <strong>anonimleştirilir</strong>: ad soyad
          ve e-posta adresiniz tanımlayıcı olmaktan çıkarılır. Kayıtlar tamamen silinmez; çünkü
          girişimlere ait onay geçmişi ve işlem kayıtları, geçmiş kararların denetlenebilirliği
          açısından bütünlüğünü korumak zorundadır. Bu tercih bilinçlidir ve talebinizde size
          bildirilir.
        </p>
      </Bolum>

      <Bolum baslik="7. Haklarınız">
        <p>KVKK m.11 uyarınca veri sorumlusuna başvurarak şu haklara sahipsiniz:</p>
        <Liste
          ogeler={[
            "Kişisel verinizin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme",
            "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
            "Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme",
            "Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme",
            "Kanunun öngördüğü şartlar çerçevesinde silinmesini veya yok edilmesini isteme",
            "İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonuç ortaya çıkmasına itiraz etme",
            "Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme",
          ]}
        />
        <p>
          Bu haklardan ikisini platform üzerinden doğrudan kullanabilirsiniz:{" "}
          <strong>Hesabım</strong> bölümünden verilerinizi dışa aktarabilir ve hesap silme talebi
          oluşturabilirsiniz. Diğer talepleriniz için{" "}
          <strong>[kvkk@kurum.org]</strong> adresine başvurabilirsiniz.
        </p>
      </Bolum>
    </YasalMetin>
  )
}
