# Cazador Galeri (0 TL, Google Drive tabanlı)

Bu proje; **backend/DB/OAuth olmadan**, sadece **Google Drive API Key** ile, paylaşıma açılmış bir `CAZADOR` klasöründen albüm + foto galeri üretir.

## Özellikler

- `/`: Albüm listesi + global arama
- `/album/:id`: Foto grid + albüm içi arama
- Foto tıklayınca Google Drive preview (`webViewLink`)
- Thumbnail lazy-load (IntersectionObserver)
- Tekli/çoklu seçim + indirme
  - Tekli: `webContentLink` varsa kullanır; yoksa `https://drive.google.com/uc?export=download&id=...`
  - Çoklu: tarayıcı limitleri için sırayla tetikler + “link listesi” indirir
- LocalStorage cache (TTL + `modifiedTime` ile “stale-while-revalidate” yaklaşımı)

## 1) Google Drive paylaşım ayarı

Bu uygulama ziyaretçiden giriş istemez. Bu yüzden içerik **public** olmalı:

1. Drive’da `CAZADOR` klasörünü aç
2. **Paylaş** → **Genel erişim**: “Bağlantıya sahip olan herkes” → Rol: “Görüntüleyici”
3. Albümler `CAZADOR` altındaki **alt klasörlerdir** (klasör adı = albüm adı)

> Not: Private içerik için OAuth gerekir (bu projede yok).

### CAZADOR Folder ID nasıl alınır?

Klasör URL’si genelde şöyledir:

`https://drive.google.com/drive/folders/<FOLDER_ID>`

`<FOLDER_ID>` kısmı `VITE_ROOT_FOLDER_ID` olur.

## 2) Google Cloud: Drive API + API Key

1. Google Cloud Console → yeni proje
2. APIs & Services → Library → **Google Drive API** → **Enable**
3. APIs & Services → Credentials → **Create credentials → API key**

### Referrer restriction (zorunlu)

API Key frontend’te olacağı için mutlaka kısıtlayın:

- **Application restrictions** → **HTTP referrers (web sites)**
  - `http://localhost:5173/*`
  - Deploy domaininiz: `https://cazador.example.com/*`
- **API restrictions** → “Restrict key” → sadece **Google Drive API**

## 3) Env setup

1. `.env.example` → `.env`
2. Doldurun:

```bash
VITE_GOOGLE_API_KEY=...
VITE_ROOT_FOLDER_ID=...
```

## 4) Local run

bash
npm install
npm run dev


## 5) Deploy (0 TL)

Bu proje tamamen statik build üretir:

```bash
npm run build
npm run preview
```



Deploy sonrası: API Key **referrer restriction** listesine production domaininizi ekleyin.

## Hata / Sorun giderme

### 403 (Erişim reddedildi)

- `CAZADOR` klasörü “Bağlantıya sahip olan herkes” olarak paylaşılmadı
- Drive API enable edilmedi
- API Key referrer restriction yanlış (domain wildcard eksik)

### 403 (Kota aşıldı: `rateLimitExceeded` / `dailyLimitExceeded`)

- Çok büyük galerilerde ilk indexleme daha fazla istek yapabilir.
- Cache/TTL sayesinde sonraki yüklemeler azalır; gerekirse TTL değerlerini büyütün.

## Kod yapısı

- `src/api/drive.ts`: Drive `files.list` wrapper + pagination
- `src/state/galleryStore.tsx`: albums + items cache + globalIndex
- `src/pages/Home.tsx`: albümler + global arama
- `src/pages/Album.tsx`: albüm grid + arama + indirme
- `src/components/*`: UI parçaları (Liquid Glass)
- `src/styles/liquid-glass.css`: tema
