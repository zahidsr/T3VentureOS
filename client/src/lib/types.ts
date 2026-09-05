// Mirrors the DTOs in T3VentureOS.Web/Dtos/*.cs. Keep in sync with the API.

export type UserRole = "SuperAdmin" | "ProgramYoneticisi" | "StartupKullanicisi"

export interface UserDto {
  id: string
  fullName: string
  email: string
  role: UserRole
  status: string
  girisimId: string | null
  girisimAdi: string | null
  emailVerified: boolean
  lastLoginAt: string | null
}

export interface AuthResponse {
  accessToken: string
  user: UserDto
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  girisimAdi: string
  sektor?: string | null
}

export interface MessageResponse {
  message: string
}

/** Shape returned by every paginated list endpoint (GET /girisimler, /programs, /admin/users). */
export interface PagedResultDto<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface InviteUserRequest {
  email: string
  fullName: string
  role: UserRole
  girisimId?: string | null
}

export interface ChangeRoleRequest {
  role: UserRole
  girisimId?: string | null
}

export interface ChangeGirisimRequest {
  girisimId: string
}

export interface BulkInviteRowRequest {
  email: string
  fullName: string
  role: UserRole
  girisimAdi?: string | null
}

export interface BulkInviteRequest {
  rows: BulkInviteRowRequest[]
}

export interface BulkInviteRowResultDto {
  satirNo: number
  email: string
  basarili: boolean
  hata: string | null
}

export interface BulkInviteResponseDto {
  toplamSatir: number
  basariliSayisi: number
  hataliSayisi: number
  sonuclar: BulkInviteRowResultDto[]
}

/** Mirrors T3VentureOS.Domain.Entities.IslemKaydi.Eylem values. */
export type IslemEylemi =
  | "KullaniciDavetEdildi"
  | "DavetYenidenGonderildi"
  | "KullaniciDevreDisiBirakildi"
  | "KullaniciAktiflestirildi"
  | "RolDegistirildi"
  | "GirisimAtamasiDegistirildi"
  | "TopluDavetTamamlandi"
  | "SatisKaydiKararVerildi"
  | "YatirimKaydiKararVerildi"
  | "BasariKaydiKararVerildi"
  | "DokumanKararVerildi"
  | "GuncellemeTalebiKararVerildi"
  | "ItirazKararVerildi"

export interface IslemKaydiDto {
  id: string
  createdAt: string
  actorAdSoyad: string
  actorEmail: string
  hedefKullaniciId: string | null
  hedefAdSoyad: string | null
  hedefEmail: string | null
  eylem: IslemEylemi
  detay: string | null
}

// ---------------------------------------------------------------- Programlar

export type ProgramDurumu = "Taslak" | "Aktif" | "Tamamlandi" | "Arsivlendi"
export type KatilimDurumu = "Basvuru" | "KabulEdildi" | "DevamEdiyor" | "Mezun" | "Ayrildi"

export interface ProgramSummaryDto {
  id: string
  name: string
  description: string | null
  kapakGorseliUrl: string | null
  durum: ProgramDurumu
  baslangicTarihi: string | null
  bitisTarihi: string | null
  katilimciSayisi: number
}

export interface ProgramKatilimciDto {
  katilimId: string
  girisimId: string
  girisimAdi: string
  donem: string | null
  durum: KatilimDurumu
  baslangicTarihi: string
}

export interface ProgramDetailDto {
  id: string
  name: string
  description: string | null
  kapakGorseliUrl: string | null
  durum: ProgramDurumu
  baslangicTarihi: string | null
  bitisTarihi: string | null
  katilimcilar: ProgramKatilimciDto[]
}

export interface CreateProgramRequest {
  name: string
  description?: string | null
  baslangicTarihi?: string | null
  bitisTarihi?: string | null
}

export interface UpdateProgramRequest {
  name: string
  description?: string | null
  durum: ProgramDurumu
  baslangicTarihi?: string | null
  bitisTarihi?: string | null
}

export interface AddKatilimRequest {
  girisimId: string
  donem?: string | null
  durum: KatilimDurumu
}

// ---------------------------------------------------------------- Girisimler

export type OnayDurumu = "Beklemede" | "Onaylandi" | "Reddedildi"
export type YatirimTuru = "Hibe" | "OnTohum" | "Tohum" | "SeriA" | "SeriB" | "SeriSonrasi" | "Diger"
export type BasariTuru = "Hibe" | "Odul" | "Sertifika" | "Diger"

export interface GirisimSummaryDto {
  id: string
  ad: string
  sektor: string | null
  kisaTanim: string | null
  teknoloji: string | null
  kurulusYili: number | null
  ekipBuyuklugu: number | null
  logoUrl: string | null
  toplamOnayliCiro: number
  createdAt: string
}

export interface CreateGirisimRequest {
  ad: string
  sektor?: string | null
  kisaTanim?: string | null
  teknoloji?: string | null
  websiteUrl?: string | null
  kurulusYili?: number | null
  ekipBuyuklugu?: number | null
}

export type UpdateGirisimRequest = CreateGirisimRequest

export interface ProgramKatilimOzetDto {
  id: string
  programId: string
  programAdi: string
  donem: string | null
  durum: KatilimDurumu
  baslangicTarihi: string
  bitisTarihi: string | null
}

export interface GelisimAdimiDto {
  id: string
  tarih: string
  baslik: string
  aciklama: string | null
}

export interface SatisKaydiDto {
  id: string
  donem: string
  ciro: number
  ihracat: number | null
  onayDurumu: OnayDurumu
  reviewNotu: string | null
  createdAt: string
}

export interface YatirimKaydiDto {
  id: string
  tur: YatirimTuru
  tutar: number
  paraBirimi: string
  tarih: string
  yatirimciAdi: string | null
  onayDurumu: OnayDurumu
  reviewNotu: string | null
  createdAt: string
}

export interface BasariDto {
  id: string
  tur: BasariTuru
  baslik: string
  aciklama: string | null
  tarih: string
  onayDurumu: OnayDurumu
  reviewNotu: string | null
  createdAt: string
}

export type DokumanTuru = "Genel" | "Sunum"

export interface DokumanDto {
  id: string
  baslik: string
  dosyaAdi: string
  dosyaUrl: string
  dosyaBoyutu: number
  tur: DokumanTuru
  onayDurumu: OnayDurumu
  reviewNotu: string | null
  createdAt: string
}

export interface GuncellemeTalebiDto {
  id: string
  ad: string
  sektor: string | null
  kisaTanim: string | null
  teknoloji: string | null
  websiteUrl: string | null
  kurulusYili: number | null
  ekipBuyuklugu: number | null
  onayDurumu: OnayDurumu
  reviewNotu: string | null
  createdAt: string
}

export interface GirisimDetailDto {
  id: string
  ad: string
  sektor: string | null
  kisaTanim: string | null
  teknoloji: string | null
  websiteUrl: string | null
  kurulusYili: number | null
  ekipBuyuklugu: number | null
  logoUrl: string | null
  createdAt: string
  programKatilimlari: ProgramKatilimOzetDto[]
  gelisimAdimlari: GelisimAdimiDto[]
  satisKayitlari: SatisKaydiDto[]
  yatirimKayitlari: YatirimKaydiDto[]
  basarilar: BasariDto[]
  dokumanlar: DokumanDto[]
  contact: GirisimContactDto | null
}

export interface GirisimContactDto {
  adSoyad: string
  unvan: string | null
  telefon: string | null
  email: string | null
  linkedInUrl: string | null
  updatedAt: string
}

export interface UpsertGirisimContactRequest {
  adSoyad: string
  unvan?: string | null
  telefon?: string | null
  email?: string | null
  linkedInUrl?: string | null
}

export interface AddGelisimAdimiRequest {
  tarih: string
  baslik: string
  aciklama?: string | null
}

export interface AddSatisKaydiRequest {
  donem: string
  ciro: number
  ihracat?: number | null
}

export interface AddYatirimKaydiRequest {
  tur: YatirimTuru
  tutar: number
  paraBirimi: string
  tarih: string
  yatirimciAdi?: string | null
}

export interface AddBasariRequest {
  tur: BasariTuru
  baslik: string
  aciklama?: string | null
  tarih: string
}

export interface SubmitGuncellemeTalebiRequest {
  ad: string
  sektor?: string | null
  kisaTanim?: string | null
  teknoloji?: string | null
  websiteUrl?: string | null
  kurulusYili?: number | null
  ekipBuyuklugu?: number | null
}

// ------------------------------------------------------------------- Onaylar

export interface OnayBekleyenSatisDto {
  id: string
  girisimId: string
  girisimAdi: string
  donem: string
  ciro: number
  ihracat: number | null
  createdAt: string
}

export interface OnayBekleyenYatirimDto {
  id: string
  girisimId: string
  girisimAdi: string
  tur: YatirimTuru
  tutar: number
  paraBirimi: string
  tarih: string
  yatirimciAdi: string | null
  createdAt: string
}

export interface OnayBekleyenBasariDto {
  id: string
  girisimId: string
  girisimAdi: string
  tur: BasariTuru
  baslik: string
  tarih: string
  createdAt: string
}

export interface OnayBekleyenDokumanDto {
  id: string
  girisimId: string
  girisimAdi: string
  baslik: string
  dosyaAdi: string
  dosyaUrl: string
  createdAt: string
}

export interface OnayBekleyenGuncellemeDto {
  id: string
  girisimId: string
  girisimAdi: string
  yeniAd: string
  yeniSektor: string | null
  createdAt: string
}

export type ItirazKonusuTuru = "Satis" | "Yatirim" | "Basari" | "Dokuman"

export interface OnayBekleyenItirazDto {
  id: string
  girisimId: string
  girisimAdi: string
  konuTuru: ItirazKonusuTuru
  konuId: string
  aciklama: string
  createdAt: string
}

/** Onay kuyruğundaki her kayıt türü — öneriler bunların hepsine bırakılabilir. */
export type OnayKonusuTuru = "Satis" | "Yatirim" | "Basari" | "Dokuman" | "Guncelleme" | "Itiraz"

/** ProgramYoneticisi'nin bağlayıcı olmayan tavsiyesi; kararı SuperAdmin verir. */
export type OneriTavsiyesi = "Onay" | "Ret" | "Cekince"

export interface OnayOnerisiDto {
  id: string
  konuTuru: OnayKonusuTuru
  konuId: string
  tavsiye: OneriTavsiyesi
  not: string | null
  oneriVerenAdSoyad: string
  createdAt: string
  updatedAt: string | null
}

export interface OnayOnerisiRequest {
  konuTuru: OnayKonusuTuru
  konuId: string
  tavsiye: OneriTavsiyesi
  not?: string
}

export interface OnayKuyruguDto {
  satislar: OnayBekleyenSatisDto[]
  yatirimlar: OnayBekleyenYatirimDto[]
  basarilar: OnayBekleyenBasariDto[]
  dokumanlar: OnayBekleyenDokumanDto[]
  guncellemeler: OnayBekleyenGuncellemeDto[]
  itirazlar: OnayBekleyenItirazDto[]
  oneriler: OnayOnerisiDto[]
}

export interface OnayKararRequest {
  onayla: boolean
  not?: string | null
}

export interface SubmitItirazRequest {
  konuTuru: ItirazKonusuTuru
  konuId: string
  aciklama: string
}

export interface ItirazDto {
  id: string
  konuTuru: ItirazKonusuTuru
  konuId: string
  aciklama: string
  onayDurumu: string
  reviewNotu: string | null
  createdAt: string
}

// ----------------------------------------------------------------- Dashboard

export interface SektorSayisiDto {
  sektor: string
  sayi: number
}

export interface YatirimTuruDagilimiDto {
  tur: YatirimTuru
  toplamTutar: number
}

export interface AylikTrendDto {
  ay: string
  ciro: number
  yatirim: number
}

export interface AiAnalizDto {
  analiz: string
}

export interface AiAnalizKaydiDto {
  id: string
  createdAt: string
  createdByAdSoyad: string
  metin: string
}

export interface DashboardStatsDto {
  toplamGirisim: number
  aktifProgramSayisi: number
  bekleyenOnaySayisi: number
  toplamOnayliYatirim: number
  toplamOnayliCiro: number
  sektorDagilimi: SektorSayisiDto[]
  yatirimTuruDagilimi: YatirimTuruDagilimiDto[]
  aylikTrend: AylikTrendDto[]
}

export interface DashboardFilters {
  baslangic?: string
  bitis?: string
  sektor?: string
  programId?: string
  girisimId?: string
}

export interface ProgramSecenegiDto {
  id: string
  ad: string
}

export interface GirisimSecenegiDto {
  id: string
  ad: string
}

export interface DashboardFiltreSecenekleriDto {
  sektorler: string[]
  programlar: ProgramSecenegiDto[]
  girisimler: GirisimSecenegiDto[]
}

// ------------------------------------------------------- Rakip Karşılaştırma

export interface GirisimKarsilastirmaDto {
  id: string
  ad: string
  sektor: string | null
  kurulusYili: number | null
  ekipBuyuklugu: number | null
  logoUrl: string | null
  toplamOnayliCiro: number
  toplamOnayliYatirim: number
  aylikTrend: AylikTrendDto[]
}

export interface GirisimKarsilastirmaFiltreParams {
  sektor?: string
  kurulusYiliMin?: number
  kurulusYiliMax?: number
  ekipMin?: number
  ekipMax?: number
  ciroMin?: number
  ciroMax?: number
  yatirimMin?: number
  yatirimMax?: number
}

/** Panelde bir girişimin "ne durumda" kartı. */
export interface GirisimSaglikDto {
  girisimId: string
  ad: string
  sektor: string | null
  logoUrl: string | null
  tamamlananAdim: number
  toplamAdim: number
  sonVeriGirisi: string | null
  /** Hiç veri girilmemişse null. */
  guncellemeUzerindenGecenGun: number | null
  bekleyenKayitSayisi: number
  iletisimVar: boolean
  sunumVar: boolean
}

export interface PanelOzetiDto {
  toplamGirisim: number
  aktifProgramSayisi: number
  bekleyenOnaySayisi: number
  toplamOnayliCiro: number
  toplamOnayliYatirim: number
  enEskiBekleyenOnayGun: number
  iletisimsizGirisimSayisi: number
  sunumsuzGirisimSayisi: number
  bayatlikEsigiGun: number
  uzunSuredirGuncellenmeyenler: GirisimSaglikDto[]
  profiliEksikOlanlar: GirisimSaglikDto[]
  tumGirisimler: GirisimSaglikDto[]
}

/** Sequoia şablonuna göre üretilmiş sunum taslağının tek bölümü. */
export interface PitchDeckBolumuDto {
  anahtar: string
  baslik: string
  icerik: string
  /** Girişimci metni elle değiştirdiyse true; yeniden üretimde bu bölüm korunur. */
  elleDuzenlendi: boolean
  /** AI'ın ürettiği metin saklıysa true — "AI metnine dön" ancak o zaman anlamlı. */
  aiMetniVar: boolean
}

export interface PitchDeckDto {
  bolumler: PitchDeckBolumuDto[]
  olusturulmaTarihi: string
  olusturanAdSoyad: string
  /** false ise taslak üretildikten sonra girişim verisi değişmiştir. */
  guncel: boolean
}
