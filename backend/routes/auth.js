import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Nurse from '../models/Nurse.js';

const router = express.Router();

// Middleware to protect routes
export const protect = async (req, res, next) => {
  try {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if nurse still exists
    const currentNurse = await Nurse.findById(decoded.id);
    if (!currentNurse) {
      return res.status(401).json({
        success: false,
        message: 'The nurse belonging to this token does no longer exist.'
      });
    }

    // 4) Check if nurse changed password after the token was issued
    if (currentNurse.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Nurse recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.nurse = currentNurse;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again!',
      error: error.message
    });
  }
};

// Middleware to restrict to certain roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.nurse.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// NURSE SIGNUP - Validates against existing nurse records
router.post('/signup', async (req, res) => {
  try {
    const { nurseId, password, confirmPassword } = req.body;

    // Validation
    if (!nurseId || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide nurseId, password, and confirmPassword'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if nurse exists in database (should exist from admin creation)
    const existingNurse = await Nurse.findOne({ nurseId });
    
    if (!existingNurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse ID not found. Please contact your administrator.'
      });
    }

    // Check if nurse already has a password (already signed up)
    if (existingNurse.password) {
      return res.status(400).json({
        success: false,
        message: 'This nurse account is already activated. Please use login instead.'
      });
    }

    // Set password and activate account
    existingNurse.password = password;
    existingNurse.isEmailVerified = true;
    await existingNurse.save();

    // Generate tokens
    const token = existingNurse.generateJWTToken();
    const refreshToken = existingNurse.generateRefreshToken();
    await existingNurse.save();

    // Remove password from output
    existingNurse.password = undefined;

    res.status(201).json({
      success: true,
      message: 'Account activated successfully',
      data: {
        nurse: {
          id: existingNurse._id,
          nurseId: existingNurse.nurseId,
          name: existingNurse.name,
          email: existingNurse.email,
          role: existingNurse.role,
          hierarchyLevel: existingNurse.hierarchyLevel,
          wardAccess: existingNurse.wardAccess,
          qualifications: existingNurse.qualifications
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during signup',
      error: error.message
    });
  }
});

// NURSE LOGIN
router.post('/login', async (req, res) => {
  try {
    const { nurseId, password } = req.body;

    // Validation
    if (!nurseId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide nurseId and password'
      });
    }

    let nurse;
    // Support admin/email login as well as nurseId login
    if (typeof nurseId === 'string' && nurseId.includes('@')) {
      // Email login path (admins or nurses using email)
      nurse = await Nurse.findOne({ email: nurseId.toLowerCase(), isActive: true }).select('+password');
      if (!nurse) {
        throw new Error('Invalid login credentials');
      }
      const isMatch = await nurse.correctPassword(password, nurse.password);
      if (!isMatch) {
        // mirror lockout behavior
        nurse.loginAttempts = (nurse.loginAttempts || 0) + 1;
        if (nurse.loginAttempts >= 5) {
          nurse.lockUntil = Date.now() + 30 * 60 * 1000;
        }
        await nurse.save();
        throw new Error('Invalid login credentials');
      }
      // reset attempts
      if (nurse.loginAttempts > 0) {
        nurse.loginAttempts = 0;
        nurse.lockUntil = undefined;
      }
      nurse.lastLogin = new Date();
      await nurse.save();
    } else {
      // Nurse ID path
      nurse = await Nurse.findByCredentials(nurseId, password);
    }

    // Generate tokens
    const token = nurse.generateJWTToken();
    const refreshToken = nurse.generateRefreshToken();
    await nurse.save();

    // Remove password from output
    nurse.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        nurse: {
          id: nurse._id,
          nurseId: nurse.nurseId,
          name: nurse.name,
          email: nurse.email,
          role: nurse.role,
          hierarchyLevel: nurse.hierarchyLevel,
          wardAccess: nurse.wardAccess,
          qualifications: nurse.qualifications,
          lastLogin: nurse.lastLogin
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Find nurse with this refresh token
    const nurse = await Nurse.findOne({
      'refreshTokens.token': refreshToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!nurse) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new tokens
    const newToken = nurse.generateJWTToken();
    const newRefreshToken = nurse.generateRefreshToken();
    
    // Revoke old refresh token
    nurse.revokeRefreshToken(refreshToken);
    await nurse.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

// LOGOUT
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      req.nurse.revokeRefreshToken(refreshToken);
      await req.nurse.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    });
  }
});

// GET CURRENT NURSE PROFILE
router.get('/profile', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        nurse: {
          id: req.nurse._id,
          nurseId: req.nurse.nurseId,
          name: req.nurse.name,
          email: req.nurse.email,
          role: req.nurse.role,
          hierarchyLevel: req.nurse.hierarchyLevel,
          wardAccess: req.nurse.wardAccess,
          qualifications: req.nurse.qualifications,
          yearsOfExperience: req.nurse.yearsOfExperience,
          workingConstraints: req.nurse.workingConstraints,
          preferences: req.nurse.preferences,
          lastLogin: req.nurse.lastLogin
        }
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
});

// UPDATE NURSE PROFILE
router.patch('/profile', protect, async (req, res) => {
  try {
    // Fields that nurses can update themselves
    const allowedFields = [
      'preferences.shiftPreferences',
      'preferences.wardPreferences',
      'workingConstraints.maxOvertimeHours',
      'workingConstraints.minRestHours'
    ];

    const updates = {};
    
    // Only allow updates to permitted fields
    Object.keys(req.body).forEach(key => {
      if (allowedFields.some(field => key.includes(field.split('.')[0]))) {
        updates[key] = req.body[key];
      }
    });

    Object.assign(req.nurse, updates);
    await req.nurse.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        nurse: {
          id: req.nurse._id,
          nurseId: req.nurse.nurseId,
          name: req.nurse.name,
          preferences: req.nurse.preferences,
          workingConstraints: req.nurse.workingConstraints
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// CHANGE PASSWORD
router.patch('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password, new password, and confirm password'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current nurse with password
    const nurse = await Nurse.findById(req.nurse._id).select('+password');

    // Check current password
    if (!(await nurse.correctPassword(currentPassword, nurse.password))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    nurse.password = newPassword;
    await nurse.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

export default router;
