const dresscodeData = {
  1:{
    date:'Sabtu, 12 September 2026',
    male:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Rambut rapi (samping tidak boleh melebihi alis dan telinga depan)','Kemeja putih','Dasi UNESA','Celana kain hitam','Ikat pinggang hitam polos','Kaos kaki hitam putih','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)'],
    female:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Kemeja putih','Rok kain hitam','Ikat pinggang hitam polos','Bagi yang berhijab: hijab segi empat hitam','Non-hijab: rambut ditata rapi; rambut panjang wajib dicepol/dikepang/harnet dengan rapi','Kaos kaki hitam putih','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)']
  },
  2:{
    date:'Sabtu, 19 September 2026',
    male:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Rambut rapi (samping tidak boleh melebihi alis dan telinga depan)','Kemeja batik berkerah','Celana kain hitam','Ikat pinggang hitam polos','Kaos kaki hitam','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)'],
    female:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Kemeja batik berkerah','Rok kain hitam','Ikat pinggang hitam polos','Bagi yang berhijab: hijab segi empat hitam','Non-hijab: rambut ditata rapi; rambut panjang wajib dicepol/dikepang/harnet dengan rapi','Kaos kaki hitam','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)']
  },
  3:{
    date:'Sabtu, 3 Oktober 2026',
    male:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Rambut rapi (samping tidak boleh melebihi alis dan telinga depan)','Kemeja batik berkerah','Celana kain hitam','Ikat pinggang hitam polos','Kaos kaki hitam','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)'],
    female:['Peci dengan pita merah maroon ukuran 3 cm dan pin Garuda diletakkan di sebelah kanan','Kemeja batik berkerah','Rok kain hitam','Ikat pinggang hitam polos','Bagi yang berhijab: hijab segi empat hitam','Non-hijab: rambut ditata rapi (bagi yang berambut panjang wajib dicepol/dikepang/harnet dengan rapi)','Kaos kaki hitam','Sepatu pantofel hitam','Pita putih di lengan bagian kiri (apabila memiliki riwayat penyakit)']
  }
};
function renderDress(day=1){
 const d=dresscodeData[day], root=document.getElementById('dressContent'); if(!root)return;
 const box=(title,icon,items)=>`<div class="dress-group"><div class="dress-group-title"><span class="dress-person">${icon}</span><div><h3>${title}</h3><span class="dress-required">WAJIB</span></div></div><ul>${items.map((x,i)=>`<li><span class="info-bullet" aria-hidden="true">${i+1}</span><span>${x}</span></li>`).join('')}</ul></div>`;
 root.innerHTML=`<section class="dress-card"><div class="dress-head"><div><span class="eyebrow">DRESSCODE • DAY ${day}</span><h2>${d.date}</h2><p>Gunakan ketentuan berikut saat kegiatan PPPK. Semua item pada card ini wajib diperhatikan.</p></div><span class="dress-badge">👔</span></div><div class="dress-grid">${box('Laki-laki','👨',d.male)}${box('Perempuan','👩',d.female)}</div></section>`;
}
document.addEventListener('DOMContentLoaded',()=>{if(document.body.dataset.page!=='dresscode')return;renderDress(1);document.querySelectorAll('#dressTabs .tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#dressTabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderDress(b.dataset.day)}));});


// PWA install button
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  const btn = document.getElementById('installAppBtn');
  if (btn) btn.hidden = false;
});
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('installAppBtn');
  if (!btn) return;
  btn.hidden = true;
  btn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      alert('Jika tombol instal belum tersedia, buka menu titik tiga (⋮) Chrome lalu pilih “Tambahkan ke layar utama” atau “Instal aplikasi”.');
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    btn.hidden = true;
  });
});
