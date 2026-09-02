using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace T3VentureOS.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Basarilar",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tur = table.Column<int>(type: "int", nullable: false),
                    Baslik = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Aciklama = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Tarih = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Basarilar", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Dokumanlar",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Baslik = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DosyaAdi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DosyaUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DosyaBoyutu = table.Column<long>(type: "bigint", nullable: false),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dokumanlar", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GelisimAdimlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tarih = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Baslik = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Aciklama = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GelisimAdimlari", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GirisimGuncellemeTalepleri",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ad = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Sektor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KisaTanim = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Teknoloji = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KurulusYili = table.Column<int>(type: "int", nullable: true),
                    EkipBuyuklugu = table.Column<int>(type: "int", nullable: true),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GirisimGuncellemeTalepleri", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Girisimler",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Ad = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Sektor = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KisaTanim = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Teknoloji = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    KurulusYili = table.Column<int>(type: "int", nullable: true),
                    EkipBuyuklugu = table.Column<int>(type: "int", nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Girisimler", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EmailVerified = table.Column<bool>(type: "bit", nullable: false),
                    FailedLoginAttempts = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Programlar",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Durum = table.Column<int>(type: "int", nullable: false),
                    BaslangicTarihi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BitisTarihi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Programlar", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Programlar_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SatisKayitlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Donem = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Ciro = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    Ihracat = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: true),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SatisKayitlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SatisKayitlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SatisKayitlari_Users_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SatisKayitlari_Users_SubmittedById",
                        column: x => x.SubmittedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VerificationTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificationTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VerificationTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "YatirimKayitlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tur = table.Column<int>(type: "int", nullable: false),
                    Tutar = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    ParaBirimi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Tarih = table.Column<DateTime>(type: "datetime2", nullable: false),
                    YatirimciAdi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OnayDurumu = table.Column<int>(type: "int", nullable: false),
                    SubmittedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_YatirimKayitlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_YatirimKayitlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_YatirimKayitlari_Users_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_YatirimKayitlari_Users_SubmittedById",
                        column: x => x.SubmittedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProgramKatilimlari",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GirisimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProgramId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Donem = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    Durum = table.Column<int>(type: "int", nullable: false),
                    BaslangicTarihi = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BitisTarihi = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Notlar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgramKatilimlari", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgramKatilimlari_Girisimler_GirisimId",
                        column: x => x.GirisimId,
                        principalTable: "Girisimler",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProgramKatilimlari_Programlar_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "Programlar",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Basarilar_GirisimId",
                table: "Basarilar",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_Basarilar_ReviewedById",
                table: "Basarilar",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_Basarilar_SubmittedById",
                table: "Basarilar",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dokumanlar_GirisimId",
                table: "Dokumanlar",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_Dokumanlar_ReviewedById",
                table: "Dokumanlar",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dokumanlar_SubmittedById",
                table: "Dokumanlar",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_GelisimAdimlari_CreatedById",
                table: "GelisimAdimlari",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_GelisimAdimlari_GirisimId",
                table: "GelisimAdimlari",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_GirisimGuncellemeTalepleri_GirisimId",
                table: "GirisimGuncellemeTalepleri",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_GirisimGuncellemeTalepleri_ReviewedById",
                table: "GirisimGuncellemeTalepleri",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_GirisimGuncellemeTalepleri_SubmittedById",
                table: "GirisimGuncellemeTalepleri",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_Girisimler_CreatedById",
                table: "Girisimler",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramKatilimlari_GirisimId_ProgramId_Donem",
                table: "ProgramKatilimlari",
                columns: new[] { "GirisimId", "ProgramId", "Donem" },
                unique: true,
                filter: "[Donem] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ProgramKatilimlari_ProgramId",
                table: "ProgramKatilimlari",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_Programlar_CreatedById",
                table: "Programlar",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_SatisKayitlari_GirisimId",
                table: "SatisKayitlari",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_SatisKayitlari_ReviewedById",
                table: "SatisKayitlari",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_SatisKayitlari_SubmittedById",
                table: "SatisKayitlari",
                column: "SubmittedById");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GirisimId",
                table: "Users",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Role",
                table: "Users",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_VerificationTokens_TokenHash",
                table: "VerificationTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VerificationTokens_UserId_Type",
                table: "VerificationTokens",
                columns: new[] { "UserId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_YatirimKayitlari_GirisimId",
                table: "YatirimKayitlari",
                column: "GirisimId");

            migrationBuilder.CreateIndex(
                name: "IX_YatirimKayitlari_ReviewedById",
                table: "YatirimKayitlari",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_YatirimKayitlari_SubmittedById",
                table: "YatirimKayitlari",
                column: "SubmittedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Basarilar_Girisimler_GirisimId",
                table: "Basarilar",
                column: "GirisimId",
                principalTable: "Girisimler",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Basarilar_Users_ReviewedById",
                table: "Basarilar",
                column: "ReviewedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Basarilar_Users_SubmittedById",
                table: "Basarilar",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Dokumanlar_Girisimler_GirisimId",
                table: "Dokumanlar",
                column: "GirisimId",
                principalTable: "Girisimler",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Dokumanlar_Users_ReviewedById",
                table: "Dokumanlar",
                column: "ReviewedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Dokumanlar_Users_SubmittedById",
                table: "Dokumanlar",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GelisimAdimlari_Girisimler_GirisimId",
                table: "GelisimAdimlari",
                column: "GirisimId",
                principalTable: "Girisimler",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GelisimAdimlari_Users_CreatedById",
                table: "GelisimAdimlari",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GirisimGuncellemeTalepleri_Girisimler_GirisimId",
                table: "GirisimGuncellemeTalepleri",
                column: "GirisimId",
                principalTable: "Girisimler",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GirisimGuncellemeTalepleri_Users_ReviewedById",
                table: "GirisimGuncellemeTalepleri",
                column: "ReviewedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_GirisimGuncellemeTalepleri_Users_SubmittedById",
                table: "GirisimGuncellemeTalepleri",
                column: "SubmittedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Girisimler_Users_CreatedById",
                table: "Girisimler",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Girisimler_GirisimId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Basarilar");

            migrationBuilder.DropTable(
                name: "Dokumanlar");

            migrationBuilder.DropTable(
                name: "GelisimAdimlari");

            migrationBuilder.DropTable(
                name: "GirisimGuncellemeTalepleri");

            migrationBuilder.DropTable(
                name: "ProgramKatilimlari");

            migrationBuilder.DropTable(
                name: "SatisKayitlari");

            migrationBuilder.DropTable(
                name: "VerificationTokens");

            migrationBuilder.DropTable(
                name: "YatirimKayitlari");

            migrationBuilder.DropTable(
                name: "Programlar");

            migrationBuilder.DropTable(
                name: "Girisimler");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
