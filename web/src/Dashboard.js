import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from './client/supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faThumbsUp, faThumbsDown, faUserCircle, faSignOutAlt, faCalendar, faPlus } from '@fortawesome/free-solid-svg-icons';
import './styles/Dashboard.css';

function Dashboard() {
  const [data, setData] = useState([]);
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [image, setImage] = useState(null);
  const [formState, setFormState] = useState({ loading: false, error: '', successMessage: '' });
  const [showDialog, setShowDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const navigate = useNavigate();

  // Asynchronous function to fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!userId) return;

    const { data: responseData, error } = await supabase
      .from('storage')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching data:', error);
      setFormState(prev => ({ ...prev, error: 'Gagal mengambil data.' }));
    } else {
      const shuffledData = responseData.sort(() => Math.random() - 0.5);
      setData(shuffledData);
    }
  }, [userId]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUserId(session?.user?.id || null);
    });

    fetchData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchData]);

  const handleCreate = async () => {
    setFormState({ loading: true, error: '', successMessage: '' });

    if (!itemName.trim() || !itemDescription.trim() || !image) {
      setFormState({ loading: false, error: 'Judul, deskripsi, dan gambar harus diisi' });
      return;
    }

    const { data: imageData, error: uploadError } = await supabase.storage
      .from('storage_dev')
      .upload(`images/${userId}/${Date.now()}_${image.name}`, image);

    if (uploadError) {
      setFormState({ loading: false, error: uploadError.message });
      return;
    }

    const imagePath = imageData?.path || imageData?.Key;
    const { data: urlData } = await supabase.storage
      .from('storage_dev')
      .getPublicUrl(imagePath);

    const { data: newItem, error: insertError } = await supabase
      .from('storage')
      .insert([{
        name: itemName,
        description: itemDescription,
        user_id: userId,
        image_url: urlData.publicUrl,
        user_email: session.user.email,
        likes: 0,
        isLiked: false
      }])
      .select();

    setFormState({ loading: false, error: '', successMessage: insertError ? insertError.message : 'Postingan berhasil ditambahkan!' });

    if (!insertError) {
      setData(prevData => [{ ...newItem[0] }, ...prevData]);
      resetForm();
    }
  };

  const resetForm = () => {
    setItemName('');
    setItemDescription('');
    setImage(null);
    setShowDialog(false);
    document.querySelector('input[type="file"]').value = '';
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Gagal keluar:', error);
    } else {
      setUserId(null);
      setSession(null);
      navigate('/');
    }
  };

  const handleLike = async (itemId, currentIsLiked) => {
    if (!userId) return;

    let likeCountChange = currentIsLiked ? -1 : 1;

    const likeAction = currentIsLiked ? supabase.from('likes').delete() : supabase.from('likes').insert([{ user_id: userId, item_id: itemId }]);

    const { error: likeError } = await likeAction.eq('item_id', itemId).eq('user_id', userId);

    if (likeError) {
      console.error('Error liking item:', likeError);
      return;
    }

    const { error: updateLikeError } = await supabase
      .from('storage')
      .update({ likes: supabase.raw(`likes + ${likeCountChange}`) })
      .eq('id', itemId);

    if (updateLikeError) {
      console.error('Error updating like count:', updateLikeError);
    } else {
      setData(prevData =>
        prevData.map(item =>
          item.id === itemId ? { ...item, isLiked: !currentIsLiked, likes: item.likes + likeCountChange } : item
        )
      );
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', options);
  };

  const renderItems = () => {
    return data.length > 0 ? (
      <ul className="item-list">
        {data.map((item) => (
          <li key={item.id} className="list-item">
            <img src={item.image_url} alt={item.name} className="item-image" />
            <div className="item-details">
              <h3>
                {item.user_email}
                <FontAwesomeIcon icon={faUserCircle} className="user-icon" />  
              </h3>
              <h3>
                {formatDate(item.created_at)}
                <FontAwesomeIcon icon={faCalendar} className="date-icon" />
              </h3>
              <span>{item.name}</span>
              <p>{item.description}</p>
              <button onClick={() => handleLike(item.id, item.isLiked)} className="like-button">
                <FontAwesomeIcon icon={item.isLiked ? faThumbsDown : faThumbsUp} />
                <span> ({item.likes})</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p>Ops Tidak ada item untuk ditampilkan.</p>
    );
  };


  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">StoryiinAja</h2>
      {session ? (
        <div className="dashboard-content">
          <div className="item-list-container">
            {renderItems()}
          </div>

            <div className="avatar-container">
              <FontAwesomeIcon
                icon={faUserCircle}
                className="avatar-icon"
                onClick={() => setShowProfileDialog(true)}
              />
          <div className="new-post-container">
            <FontAwesomeIcon
              icon={faPlus}
              className="button"
              onClick={() => setShowDialog(true)}
            />
            </div>
            <div className="avatar-container">
              <FontAwesomeIcon
                icon={faSignOutAlt}
                className="avatar-icon"
                onClick={() => handleLogout(true)}  
              />
            </div>
            {showDialog && (
              <div className="dialog">
                <div className="dialog-content">
                  <h3>Tambah Postingan Baru</h3>
                  <input
                    type="text"
                    placeholder="Judul Postingan"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="input"
                  />
                  <input
                    type="text"
                    placeholder="Deskripsi Postingan"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="input"
                  />
                  <input
                    type="file"
                    accept="image/*, video/*"
                    onChange={(e) => setImage(e.target.files[0])}
                    className="input"
                  />
                  <button onClick={handleCreate} className="button" disabled={formState.loading}>
                    {formState.loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Tambah'}
                  </button>
                  {formState.error && <p className="error-message">{formState.error}</p>}
                  {formState.successMessage && <p className="success-message">{formState.successMessage}</p>}
                  <button onClick={() => setShowDialog(false)} className="button">Tutup</button>
                </div>
              </div>
            )}
            {showProfileDialog && (
              <div className="dialog">
                <div className="dialog-content">
                  <h3>Profile Pengguna</h3>
                  <p>Email: {session?.user?.email}</p>
                  <button onClick={() => setShowProfileDialog(false)} className="button">Tutup</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <h2>Silakan masuk untuk melanjutkan.</h2>
      )}
    </div>
  );
}

export default Dashboard;
