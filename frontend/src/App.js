import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// Context for authentication
const AuthContext = createContext();

// Custom hook for authentication
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentRole, setCurrentRole] = useState(null);

  useEffect(() => {
    if (token) {
      // Get user profile
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    }
  };

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('token', accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setCurrentRole(null);
    localStorage.removeItem('token');
  };

  const selectRole = (role) => {
    setCurrentRole(role);
  };

  const value = {
    user,
    token,
    currentRole,
    login,
    logout,
    selectRole,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Login/Register Component
const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    preferred_role: 'both'
  });
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cities`);
      const data = await response.json();
      setCities(data.cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user, data.access_token);
      } else {
        setError(data.detail || 'Bir hata oluştu');
      }
    } catch (error) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">YAPARIM</h1>
          <p className="text-gray-600">Türkiye'nin görev pazarı</p>
        </div>

        <div className="flex mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-l-lg ${
              isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-r-lg ${
              !isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Ad Soyad"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {!isLogin && (
            <>
              <input
                type="tel"
                name="phone"
                placeholder="Telefon"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Şehir Seçin</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select
                name="preferred_role"
                value={formData.preferred_role}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="both">Her İkisi</option>
                <option value="task_poster">Görev Veren</option>
                <option value="service_provider">Hizmet Sağlayıcı</option>
              </select>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Lütfen bekleyin...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>
      </div>
    </div>
  );
};

// Role Selection Component
const RoleSelection = () => {
  const { user, selectRole } = useAuth();

  const handleRoleSelect = async (role) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/select-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        selectRole(role);
      }
    } catch (error) {
      console.error('Error selecting role:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hoş Geldiniz, {user?.name}</h1>
          <p className="text-gray-600">Bugün nasıl yardımcı olmak istersiniz?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div 
            onClick={() => handleRoleSelect('task_poster')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Görev Veren</h3>
              <p className="text-blue-100">Yapılmasını istediğiniz görevleri paylaşın</p>
              <ul className="mt-4 text-sm text-blue-100 space-y-1">
                <li>• Görev oluşturun</li>
                <li>• Başvuruları değerlendirin</li>
                <li>• Güvenli ödeme yapın</li>
              </ul>
            </div>
          </div>

          <div 
            onClick={() => handleRoleSelect('service_provider')}
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🛠️</div>
              <h3 className="text-xl font-semibold mb-2">Hizmet Sağlayıcı</h3>
              <p className="text-green-100">Yeteneklerinizle para kazanın</p>
              <ul className="mt-4 text-sm text-green-100 space-y-1">
                <li>• Görevleri keşfedin</li>
                <li>• Başvuru yapın</li>
                <li>• Güvenli ödeme alın</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Daha sonra istediğiniz zaman rolünüzü değiştirebilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
};

// Task Poster Dashboard
const TaskPosterDashboard = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    category: ''
  });

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchCities();
  }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.category) params.append('category', filters.category);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tasks?${params}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cities`);
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">YAPARIM</h1>
              <span className="ml-4 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full">
                Görev Veren
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hoş geldiniz, {user?.name}</span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Görevleri Keşfet
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Görev Oluştur
            </button>
            <button
              onClick={() => setActiveTab('my-tasks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my-tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Görevlerim
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && (
          <BrowseTasks 
            tasks={tasks} 
            categories={categories} 
            cities={cities}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
          />
        )}
        {activeTab === 'create' && (
          <CreateTask categories={categories} cities={cities} />
        )}
        {activeTab === 'my-tasks' && (
          <MyTasks />
        )}
      </div>
    </div>
  );
};

// Browse Tasks Component
const BrowseTasks = ({ tasks, categories, cities, filters, setFilters, loading }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mevcut Görevler</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filters.city}
            onChange={(e) => setFilters({...filters, city: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tüm Şehirler</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Görevler yükleniyor...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Henüz görev bulunmuyor.</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard key={task._id} task={task} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Task Card Component
const TaskCard = ({ task }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
          <p className="text-gray-600 mb-3">{task.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {task.category}
            </span>
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              📍 {task.city}, {task.district}
            </span>
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              💰 {task.budget} TL
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Görev Veren: {task.poster_name}</span>
            <span>Son Tarih: {formatDate(task.deadline)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          İletişim: {task.contact_info}
        </div>
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
          Başvur
        </button>
      </div>
    </div>
  );
};

// Create Task Component
const CreateTask = ({ categories, cities }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    district: '',
    budget: '',
    deadline: '',
    contact_info: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          deadline: new Date(formData.deadline).toISOString()
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          title: '',
          description: '',
          category: '',
          city: '',
          district: '',
          budget: '',
          deadline: '',
          contact_info: ''
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Görev Oluştur</h2>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Görev başarıyla oluşturuldu!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Görev Başlığı
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Görev Açıklaması
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Kategori Seçin</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şehir
            </label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Şehir Seçin</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İlçe
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bütçe (TL)
            </label>
            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              required
              min="1"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Son Tarih
          </label>
          <input
            type="datetime-local"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İletişim Bilgileri
          </label>
          <input
            type="text"
            name="contact_info"
            value={formData.contact_info}
            onChange={handleChange}
            required
            placeholder="Telefon, email veya diğer iletişim bilgileri"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Oluşturuluyor...' : 'Görev Oluştur'}
        </button>
      </form>
    </div>
  );
};

// My Tasks Component
const MyTasks = () => {
  const [userTasks, setUserTasks] = useState({ created_tasks: [], applications: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserTasks();
  }, []);

  const fetchUserTasks = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTasks(data);
      }
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Görevler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Oluşturduğum Görevler</h2>
        {userTasks.created_tasks.length === 0 ? (
          <p className="text-gray-600">Henüz görev oluşturmadınız.</p>
        ) : (
          <div className="grid gap-4">
            {userTasks.created_tasks.map(task => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Başvurularım</h2>
        {userTasks.applications.length === 0 ? (
          <p className="text-gray-600">Henüz başvuru yapmadınız.</p>
        ) : (
          <div className="grid gap-4">
            {userTasks.applications.map(application => (
              <div key={application._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Başvuru ID: {application._id}
                </h3>
                <p className="text-gray-600 mb-2">Önerilen Fiyat: {application.offered_price} TL</p>
                <p className="text-gray-600 mb-2">Durum: {application.status}</p>
                <p className="text-gray-600">{application.proposal}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Service Provider Dashboard (similar structure)
const ServiceProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    category: ''
  });

  const { user, logout } = useAuth();

  useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchCities();
  }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.city) params.append('city', filters.city);
      if (filters.category) params.append('category', filters.category);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tasks?${params}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/cities`);
      const data = await response.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleApplyForTask = async (taskId, proposal, offeredPrice) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          task_id: taskId,
          proposal: proposal,
          offered_price: parseFloat(offeredPrice)
        }),
      });

      if (response.ok) {
        alert('Başvuru başarıyla gönderildi!');
        fetchTasks(); // Refresh tasks
      } else {
        const error = await response.json();
        alert(error.detail || 'Başvuru gönderilirken hata oluştu');
      }
    } catch (error) {
      console.error('Error applying for task:', error);
      alert('Başvuru gönderilirken hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">YAPARIM</h1>
              <span className="ml-4 bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                Hizmet Sağlayıcı
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hoş geldiniz, {user?.name}</span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Görevleri Keşfet
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'applications'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Başvurularım
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'browse' && (
          <BrowseTasksForProvider 
            tasks={tasks} 
            categories={categories} 
            cities={cities}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
            onApply={handleApplyForTask}
          />
        )}
        {activeTab === 'applications' && (
          <MyApplications />
        )}
      </div>
    </div>
  );
};

// Browse Tasks For Provider Component
const BrowseTasksForProvider = ({ tasks, categories, cities, filters, setFilters, loading, onApply }) => {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [applicationData, setApplicationData] = useState({
    proposal: '',
    offered_price: ''
  });

  const handleApply = (task) => {
    setSelectedTask(task);
    setApplicationData({
      proposal: '',
      offered_price: task.budget.toString()
    });
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!applicationData.proposal.trim() || !applicationData.offered_price) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    await onApply(selectedTask._id, applicationData.proposal, applicationData.offered_price);
    setShowApplicationModal(false);
    setSelectedTask(null);
    setApplicationData({ proposal: '', offered_price: '' });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mevcut Görevler</h2>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filters.city}
            onChange={(e) => setFilters({...filters, city: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Tüm Şehirler</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Görevler yükleniyor...</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Henüz görev bulunmuyor.</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCardForProvider key={task._id} task={task} onApply={handleApply} />
            ))
          )}
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Göreve Başvur</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Öneriniz
                </label>
                <textarea
                  value={applicationData.proposal}
                  onChange={(e) => setApplicationData({...applicationData, proposal: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Bu görevi nasıl yapacağınızı ve neden seçilmeniz gerektiğini açıklayın..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Önerilen Fiyat (TL)
                </label>
                <input
                  type="number"
                  value={applicationData.offered_price}
                  onChange={(e) => setApplicationData({...applicationData, offered_price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowApplicationModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleSubmitApplication}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Başvur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Task Card For Provider Component
const TaskCardForProvider = ({ task, onApply }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
          <p className="text-gray-600 mb-3">{task.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              {task.category}
            </span>
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
              📍 {task.city}, {task.district}
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              💰 {task.budget} TL
            </span>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Görev Veren: {task.poster_name}</span>
            <span>Son Tarih: {formatDate(task.deadline)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          İletişim: {task.contact_info}
        </div>
        <button 
          onClick={() => onApply(task)}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
        >
          Başvur
        </button>
      </div>
    </div>
  );
};

// My Applications Component
const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/tasks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Başvurular yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Başvurularım</h2>
      
      {applications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Henüz başvuru yapmadınız.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(application => (
            <div key={application._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Görev ID: {application.task_id}
                  </h3>
                  <p className="text-gray-600 mb-2">
                    <strong>Öneriniz:</strong> {application.proposal}
                  </p>
                  <p className="text-gray-600 mb-2">
                    <strong>Önerilen Fiyat:</strong> {application.offered_price} TL
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    application.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : application.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {application.status === 'pending' ? 'Beklemede' : 
                     application.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Başvuru Tarihi: {new Date(application.created_at).toLocaleDateString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

// App Content Component
const AppContent = () => {
  const { isAuthenticated, currentRole } = useAuth();

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  if (!currentRole) {
    return <RoleSelection />;
  }

  return currentRole === 'task_poster' ? <TaskPosterDashboard /> : <ServiceProviderDashboard />;
};

export default App;