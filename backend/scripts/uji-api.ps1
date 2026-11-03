# Fungsi bantu PowerShell untuk menguji API secara manual dengan data dummy.
# Muat di jendela PowerShell mana pun (dari folder repo):
#   . .\backend\scripts\uji-api.ps1
#   Masuk-Admin            # minta username dan kata sandi admin dummy (tersembunyi), mengisi $admin
# Kata sandi tidak pernah ditulis di berkas atau riwayat perintah.

$base = 'http://localhost:3000/api'

# Panggil API: Api <metode> <rute> [<body>] [<sesi>]. Mengembalikan { Status, Data }.
function Api {
  param($Metode, $Rute, $Body, $Sesi)
  $p = @{ Uri = "$base$Rute"; Method = $Metode; UseBasicParsing = $true }
  if ($Sesi) { $p.WebSession = $Sesi }
  if ($null -ne $Body) {
    $p.ContentType = 'application/json; charset=utf-8'
    $p.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 6 -Compress))
  }
  try {
    $r = Invoke-WebRequest @p
    [pscustomobject]@{ Status = [int]$r.StatusCode; Data = $(if ($r.Content) { $r.Content | ConvertFrom-Json }) }
  } catch {
    [pscustomobject]@{ Status = [int]$_.Exception.Response.StatusCode; Data = $_.ErrorDetails.Message }
  }
}

# Status HTTP pengambilan gambar soal: Gambar <nama> <sesi>
function Gambar($nama, $sesi) {
  try { (Invoke-WebRequest "$base/peserta/gambar/$nama" -WebSession $sesi -UseBasicParsing).StatusCode }
  catch { [int]$_.Exception.Response.StatusCode }
}

# Login admin dummy, hasilnya di $admin (dipakai sebagai argumen <sesi> untuk rute admin).
function Masuk-Admin {
  param([string]$Username = 'admin.uji')
  $script:admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $pw = Read-Host "Kata sandi $Username" -AsSecureString
  $hasil = Api POST /admin/login @{ username = $Username; password = [Net.NetworkCredential]::new('', $pw).Password } $script:admin
  Remove-Variable pw
  $global:admin = $script:admin
  "Login admin: $($hasil.Status)"
}

"Fungsi Api, Gambar, dan Masuk-Admin siap. Jalankan: Masuk-Admin"
