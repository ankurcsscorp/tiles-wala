import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import "./Auth.css";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    userType: "",
    adminKey: ""
  });
  
  const [errors, setErrors] = useState({});
  
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      setGoogleUser({
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || ""
      });
      
      setFormData({
        ...formData,
        name: user.displayName || ""
      });
      
      setIsLogin(false);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Failed to sign in with Google");
    }
  };
  
  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
      setGoogleUser(null);
      setFormData({
        name: "",
        mobile: "",
        password: "",
        confirmPassword: "",
        userType: "",
        adminKey: ""
      });
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === "userType") {
      setShowAdminKey(value === "Admin");
    }
  };
  
  const validateLogin = () => {
    const newErrors = {};
    if (!formData.mobile) newErrors.mobile = "Mobile number is required";
    if (!formData.password) newErrors.password = "Password is required";
    return newErrors;
  };
  
  const validateSignup = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.mobile) newErrors.mobile = "Mobile number is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Confirm password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.userType) newErrors.userType = "User type is required";
    if (formData.userType === "Admin" && formData.adminKey !== "1021") {
      newErrors.adminKey = "Invalid admin key";
    }
    return newErrors;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      const newErrors = validateLogin();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      } else {
        console.log("Login successful:", formData);
        alert("Login successful!");
      }
    } else {
      const newErrors = validateSignup();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      } else {
        console.log("Signup successful:", formData);
        console.log("Google User Data:", googleUser);
        alert("Signup successful!");
        handleGoogleSignOut();
      }
    }
  };
  
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    if (!isLogin) {
      setGoogleUser(null);
    }
    setFormData({
      name: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      userType: "",
      adminKey: ""
    });
    setShowAdminKey(false);
  };
  
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? "Sign In" : "Sign Up"}</h2>
        
        {isLogin && (
          <div className="google-signin">
            <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="google-icon"
              />
              Sign in with Google
            </button>
            <p className="or-divider">OR</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && googleUser && (
            <div className="google-info">
              <img src={googleUser.photoURL} alt="Profile" className="google-profile" />
              <p>Signed in as: {googleUser.email}</p>
            </div>
          )}
          
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                />
                {errors.name && <span className="error">{errors.name}</span>}
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Mobile Number</label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
            />
            {errors.mobile && <span className="error">{errors.mobile}</span>}
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>
          
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
              </div>
              
              <div className="form-group">
                <label>User Type</label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                >
                  <option value="">Select user type</option>
                  <option value="Admin">Admin</option>
                  <option value="Salesperson">Salesperson</option>
                  <option value="Tile Mistire">Tile Mistire</option>
                  <option value="Thikedaar">Thikedaar</option>
                  <option value="Plumber Mistiri">Plumber Mistiri</option>
                </select>
                {errors.userType && <span className="error">{errors.userType}</span>}
              </div>
              
              {showAdminKey && (
                <div className="form-group">
                  <label>Admin Key</label>
                  <input
                    type="password"
                    name="adminKey"
                    value={formData.adminKey}
                    onChange={handleChange}
                    placeholder="Enter admin key"
                  />
                  {errors.adminKey && <span className="error">{errors.adminKey}</span>}
                </div>
              )}
            </>
          )}
          
          <button type="submit" className="auth-btn">
            {isLogin ? "Sign In" : "Complete Sign Up"}
          </button>
        </form>
        
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" className="toggle-btn" onClick={toggleMode}>
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;

