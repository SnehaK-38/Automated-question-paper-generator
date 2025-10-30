import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('eduApp_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Ensure required array properties exist
      setUser({
        ...parsedUser,
        testHistory: parsedUser.testHistory || [],
        downloadedPapers: parsedUser.downloadedPapers || []
      });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // In a real app, this would be an API call
      const users = JSON.parse(localStorage.getItem('eduApp_users') || '[]');
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (foundUser) {
        const userWithoutPassword = { ...foundUser };
        delete userWithoutPassword.password;
        // Ensure required array properties exist
        const userWithArrays = {
          ...userWithoutPassword,
          testHistory: userWithoutPassword.testHistory || [],
          downloadedPapers: userWithoutPassword.downloadedPapers || []
        };
        setUser(userWithArrays);
        localStorage.setItem('eduApp_user', JSON.stringify(userWithArrays));
        return { success: true };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (userData) => {
    try {
      const users = JSON.parse(localStorage.getItem('eduApp_users') || '[]');
      
      if (users.find(u => u.email === userData.email)) {
        return { success: false, error: 'User already exists' };
      }

      const newUser = {
        id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString(),
        testHistory: [],
        downloadedPapers: []
      };

      users.push(newUser);
      localStorage.setItem('eduApp_users', JSON.stringify(users));
      
      const userWithoutPassword = { ...newUser };
      delete userWithoutPassword.password;
      setUser(userWithoutPassword);
      localStorage.setItem('eduApp_user', JSON.stringify(userWithoutPassword));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eduApp_user');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('eduApp_user', JSON.stringify(updatedUser));
    
    // Update in users list
    const users = JSON.parse(localStorage.getItem('eduApp_users') || '[]');
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, ...updatedData } : u);
    localStorage.setItem('eduApp_users', JSON.stringify(updatedUsers));
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};