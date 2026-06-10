# Cara memasang profil Origami Angel System

Struktur akhirnya harus seperti ini:

```text
Naufalspurnomo/
├── README.md
├── assets/
│   ├── origami-banner.png
│   ├── origami-system.svg
│   └── origami-divider.svg
├── profile/
│   ├── stats.svg
│   └── top-langs.svg
└── .github/
    └── workflows/
        ├── snake.yml
        └── stats.yml
```

## Langkah pemasangan

1. Salin semua file dan folder ke repository profil `Naufalspurnomo/Naufalspurnomo`.
2. Commit dan push ke branch `main`.
3. Buka **Settings → Actions → General → Workflow permissions**.
4. Pilih **Read and write permissions**, kemudian simpan.
5. Buka tab **Actions**.
6. Jalankan **Generate Angel Snake** melalui tombol **Run workflow**.
7. Jalankan **Refresh Battle Data** melalui tombol **Run workflow**.
8. Tunggu sekitar 1–3 menit, lalu refresh halaman profil GitHub.

## Yang perlu disesuaikan

- Informasi pada bagian `PLAYER`, `SYSTEM STATUS`, dan `MISSION BOARD` di `README.md`.
- Tambahkan tautan sosial asli di bagian `LINK TERMINAL`.
- Jangan menghapus folder `profile`; dua SVG awal di sana adalah placeholder dan akan diganti otomatis oleh workflow.
- Workflow snake memakai lima tingkat warna kontribusi. Jangan dikurangi menjadi empat karena generator mengharapkan tepat lima warna.

## Bila gambar snake belum muncul

Pastikan branch `output` sudah dibuat oleh workflow dan URL berikut dapat dibuka:

```text
https://raw.githubusercontent.com/Naufalspurnomo/Naufalspurnomo/output/github-snake-dark.svg
```

Jika repository profil memakai branch selain `main`, ubah bagian `branches:` pada kedua workflow.
