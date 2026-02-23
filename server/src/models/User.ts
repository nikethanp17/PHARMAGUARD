import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface IAnalysisEntry {
    id: string;
    timestamp: string;
    patientId: string;
    drugs: string[];
    vcfFileName: string;
}

export interface IRefreshToken {
    token: string;
    createdAt: Date;
    userAgent?: string;
    ip?: string;
}

export interface IUser extends Document {
    fullName: string;
    email: string;
    username: string;
    phone?: string;
    passwordHash: string;
    role: 'patient' | 'admin';

    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;

    passwordResetToken?: string;
    passwordResetExpiry?: Date;

    refreshTokens: IRefreshToken[];

    // Server-side rate limiting
    loginAttempts: number;
    lockUntil?: Date;

    lastLoginAt?: Date;
    analysisHistory: IAnalysisEntry[];

    createdAt: Date;
    updatedAt: Date;

    // Instance methods
    comparePassword(candidate: string): Promise<boolean>;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;
    isLocked(): boolean;
    incrementLoginAttempts(): Promise<void>;
    resetLoginAttempts(): Promise<void>;
    toSafeObject(): Omit<IUser, 'passwordHash' | 'refreshTokens' | 'emailVerificationToken' | 'passwordResetToken'>;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const analysisEntrySchema = new Schema<IAnalysisEntry>(
    {
        id: String,
        timestamp: String,
        patientId: String,
        drugs: [String],
        vcfFileName: String,
    },
    { _id: false }
);

const refreshTokenSchema = new Schema<IRefreshToken>(
    {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        userAgent: String,
        ip: String,
    },
    { _id: false }
);

const userSchema = new Schema<IUser>(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            maxlength: [100, 'Full name must be at most 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            lowercase: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username must be at most 30 characters'],
            match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, underscores'],
        },
        phone: {
            type: String,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false, // Never returned in queries by default
        },
        role: {
            type: String,
            enum: ['patient', 'admin'],
            default: 'patient',
        },

        isEmailVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String, select: false },
        emailVerificationExpiry: { type: Date, select: false },

        passwordResetToken: { type: String, select: false },
        passwordResetExpiry: { type: Date, select: false },

        refreshTokens: {
            type: [refreshTokenSchema],
            default: [],
            select: false,
        },

        loginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date },

        lastLoginAt: { type: Date },
        analysisHistory: { type: [analysisEntrySchema], default: [] },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

// ── Pre-save Hook ─────────────────────────────────────────────────────────────

userSchema.pre('save', async function (next) {
    // Only hash if passwordHash was directly set (registration / reset)
    // We mark this field 'modified' manually when setting raw password
    if (!this.isModified('passwordHash')) return next();
    try {
        // If the value looks like a plain text password (not already a bcrypt hash)
        if (!this.passwordHash.startsWith('$2')) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, env.bcryptRounds);
        }
        next();
    } catch (err: any) {
        next(err);
    }
});

// ── Instance Methods ──────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.isLocked = function (): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

userSchema.methods.incrementLoginAttempts = async function (): Promise<void> {
    // If lockout has expired, restart the count
    if (this.lockUntil && this.lockUntil < new Date()) {
        await this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
        return;
    }
    const updates: Record<string, unknown> = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
        updates['$set'] = { lockUntil: new Date(Date.now() + LOCK_TIME_MS) };
    }
    await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function (): Promise<void> {
    await this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

userSchema.methods.generateEmailVerificationToken = function (): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
    this.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token; // raw token sent in email
};

userSchema.methods.generatePasswordResetToken = function (): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    this.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
};

userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.refreshTokens;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpiry;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpiry;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    delete obj.__v;
    return obj;
};

// ── Model ─────────────────────────────────────────────────────────────────────

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
