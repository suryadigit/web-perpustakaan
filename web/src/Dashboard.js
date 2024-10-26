import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './client/supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [data, setData] = useState([]);
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [image, setImage] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const { data: responseData, error } = await supabase
      .from('storage')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error mengambil data:', error);
    } else {
      console.log('Data berhasil diambil:', responseData);
      setData(responseData);
    }
  }, [userId]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUserId(session?.user?.id || null);
    });

    if (userId) fetchData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [userId, fetchData]);

  const handleCreate = async () => {
    setError('');

    if (itemName.trim() === '' || !image) {
      setError('Nama item dan gambar harus diisi');
      return;
    }

    const { data: imageData, error: uploadError } = await supabase.storage
      .from('storage_dev')
      .upload(`images/${userId}/${Date.now()}_${image.name}`, image);

    if (uploadError) {
      console.error('Gagal mengunggah gambar:', uploadError);
      setError(uploadError.message);
      return;
    }

    const imagePath = imageData?.path || imageData?.Key;
    if (!imagePath) {
      setError('Jalur gambar tidak ditemukan');
      return;
    }

    const { data: urlData, error: urlError } = supabase.storage
      .from('storage_dev')
      .getPublicUrl(imagePath);

    if (urlError) {
      console.error('Gagal mendapatkan URL publik:', urlError);
      setError(urlError.message);
      return;
    }

    const publicURL = urlData.publicUrl;

    const { data: newItem, error } = await supabase
      .from('storage')
      .insert([{ name: itemName, user_id: userId, image_url: publicURL }])
      .select();

    if (error) {
      console.error('Gagal menambahkan item:', error);
      setError(error.message);
    } else if (newItem) {
      setData((prevData) => [...prevData, newItem[0]]);
      setItemName('');
      setImage(null);

      const inputFile = document.querySelector('input[type="file"]');
      if (inputFile) {
        inputFile.value = '';
      }
    }
  };

  const handleUpdate = async () => {
    setError('');
    if (!editItem) {
      setError('Item yang akan diperbarui belum dipilih');
      return;
    }

    const { data: updatedItem, error } = await supabase
      .from('storage')
      .update({ name: itemName })
      .eq('id', editItem.id)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Gagal memperbarui item:', error);
      setError(error.message);
    } else if (updatedItem) {
      setData((prevData) =>
        prevData.map((item) => (item.id === editItem.id ? updatedItem[0] : item))
      );
      setEditItem(null);
      setItemName('');
      setImage(null);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('storage').delete().eq('id', id).eq('user_id', userId);
    if (error) setError(error.message);
    else {
      setData((prevData) => prevData.filter((item) => item.id !== id));
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Gagal keluar:', error);
    else {
      setUserId(null);
      setSession(null);
      navigate('/');
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Web Perpustakaan</h1>
      {session ? (
        <div>
          <h2>Hai, {session.user.email}</h2>
          <button onClick={handleLogout} className="button">Keluar</button>
          <div className="form">
            <input
              type="text"
              placeholder="Nama item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="input"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
              className="input"
            />
            <button onClick={editItem ? handleUpdate : handleCreate} className="button">
              {editItem ? 'Perbarui' : 'Tambah'}
            </button>
            {editItem && (
              <button onClick={() => { setEditItem(null); setItemName(''); setImage(null); }} className="cancel-button">
                Batal
              </button>
            )}
          </div>
          {error && <p className="error-message">{error}</p>}
          {data.length > 0 ? (
            <ul className="item-list">
              {data.map((item) => (
                <li key={item.id} className="list-item">
                  <img src={item.image_url} alt={item.name} className="item-image" />
                  <div className="item-details">
                    <span>{item.name}</span>
                  </div>
                  <div className="button-group">
                    <button
                      onClick={() => {
                        setEditItem(item);
                        setItemName(item.name);
                        setImage(null);
                      }}
                      className="edit-button"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-button"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Data tidak tersedia</p>
          )}
        </div>
      ) : (
        <p>Silakan masuk untuk melihat data.</p>
      )}
    </div>
  );
}

export default Dashboard;
