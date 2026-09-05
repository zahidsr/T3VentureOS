namespace T3VentureOS.Domain;

public enum UserRole { SuperAdmin, ProgramYoneticisi, StartupKullanicisi }

public enum UserStatus { Invited, Active, Disabled }

public enum ProgramDurumu { Taslak, Aktif, Tamamlandi, Arsivlendi }

public enum KatilimDurumu { Basvuru, KabulEdildi, DevamEdiyor, Mezun, Ayrildi }

public enum OnayDurumu { Beklemede, Onaylandi, Reddedildi }

public enum YatirimTuru { Hibe, OnTohum, Tohum, SeriA, SeriB, SeriSonrasi, Diger }

public enum BasariTuru { Hibe, Odul, Sertifika, Diger }

public enum DokumanTuru { Genel, Sunum }

public enum VerificationTokenType { EmailVerify, PasswordReset }

public enum BildirimTuru { OnayKarari, ItirazSonucu, ProgramGuncellemesi, Sistem }

/// <summary>Which of the four onay-durumu-bearing record types an Itiraz targets.</summary>
public enum ItirazKonusuTuru { Satis, Yatirim, Basari, Dokuman }
