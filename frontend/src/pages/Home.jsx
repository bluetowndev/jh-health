import { useState, useEffect, Fragment, useRef } from 'react';
import { getDistricts, getFacilityTypes, getFacilities, sendEmailOTP, verifyEmailOTP, submitComplaint, uploadComplaintImages, checkDuplicateComplaint } from '../api';
import Navbar from '../components/Navbar';
import HomeHeroBanner from '../components/HomeHeroBanner';
import PublicFooter from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ISSUES = [
  { id: 'No Internet Connectivity', icon: '🔌', title: 'No Internet Connectivity', desc: 'Cannot access the internet at all' },
  { id: 'Slow Internet Speed', icon: '🐢', title: 'Slow Internet Speed', desc: 'Internet is extremely slow or unusable' },
  { id: 'Frequent Disconnections', icon: '🔄', title: 'Frequent Disconnections', desc: 'Connection drops repeatedly' },
  { id: 'WiFi Not Visible / SSID Not Broadcasting', icon: '📡', title: 'WiFi Not Visible', desc: 'SSID not showing in available networks' },
  { id: 'Unable to Connect to WiFi', icon: '🔒', title: 'Unable to Connect', desc: 'Password or authentication issues' },
  { id: 'Limited Connectivity (Connected but No Internet)', icon: '⚠️', title: 'Limited Connectivity', desc: 'Connected to WiFi but no internet access' },
  { id: 'Router / Access Point Not Working', icon: '📶', title: 'Device Not Working', desc: 'Router/Access point hardware issue' },
  { id: 'Power Issue at Equipment', icon: '⚡', title: 'Power Issue', desc: 'Equipment has no power / power failure' },
  { id: 'Other', icon: '💬', title: 'Other Issue', desc: 'Something else not listed above' },
];

const STEP_LABELS = ['Facility', 'Details', 'Issue', 'Confirm'];
const COMPLAINT_DRAFT_KEY = 'complaintFormDraftV1';
const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024; // 20KB
const INITIAL_FORM = {
  userName: '',
  mobile: '',
  email: '',
  district: '',
  facilityType: '',
  facilityCode: '',
  facilityName: '',
  issueCategory: [],
  issueDescription: '',
  attachmentUrls: [],
};

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image.'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Compression failed.'));
      resolve(blob);
    }, type, quality);
  });

async function compressImageToLimit(file, maxBytes = MAX_IMAGE_UPLOAD_BYTES) {
  if (file.size <= maxBytes) return file;
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  for (let scaleAttempt = 0; scaleAttempt < 7; scaleAttempt += 1) {
    let quality = 0.86;
    canvas.width = Math.max(120, Math.round(width));
    canvas.height = Math.max(120, Math.round(height));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (let qualityAttempt = 0; qualityAttempt < 8; qualityAttempt += 1) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob.size <= maxBytes) {
        const baseName = (file.name || 'attachment').replace(/\.[^.]+$/, '');
        return new File([blob], `${baseName}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
      quality = Math.max(0.28, quality - 0.09);
    }

    width *= 0.84;
    height *= 0.84;
  }

  throw new Error('Image could not be compressed below 20KB.');
}

function ReportWifiBadge({ variant }) {
  return (
    <div className={`report-cta-art report-cta-art--${variant}`} aria-hidden>
      <div className="report-cta-art-circle">
        <img
          src="/icons/wifi-report.png"
          alt=""
          className="report-cta-wifi-logo"
          decoding="async"
        />
      </div>
    </div>
  );
}

function StepIndicator({ current }) {
  return (
    <div className="step-progress-shell">
      <p className="step-progress-meta">
        Step <strong>{current + 1}</strong> of 4 · <strong>{STEP_LABELS[current]}</strong>
      </p>
      <div className="step-progress-track">
        {STEP_LABELS.map((label, i) => (
          <Fragment key={label}>
            {i > 0 && (
              <div
                className={`step-progress-connector ${current >= i ? 'done' : ''}`}
                role="presentation"
              />
            )}
            <div
              className={`step-progress-node ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
            >
              <span className="step-progress-dot" />
              <span className="step-progress-label">{label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const draftRef = useRef(null);
  if (draftRef.current === null) {
    try {
      draftRef.current = JSON.parse(localStorage.getItem(COMPLAINT_DRAFT_KEY) || 'null');
    } catch {
      draftRef.current = null;
    }
  }
  const draft = draftRef.current;
  const [step, setStep] = useState(() => Number.isInteger(draft?.step) ? Math.min(Math.max(draft.step, 0), 3) : 0);
  const [form, setForm] = useState(() => {
    const saved = draft?.form || {};
    return {
      ...INITIAL_FORM,
      ...saved,
      issueCategory: Array.isArray(saved.issueCategory) ? saved.issueCategory : [],
      attachmentUrls: Array.isArray(saved.attachmentUrls) ? saved.attachmentUrls : [],
    };
  });
  const [errors, setErrors] = useState({});
  const [districts, setDistricts] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [facilityError, setFacilityError] = useState('');
  const [emailVerified, setEmailVerified] = useState(Boolean(draft?.emailVerified));
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState(null); // { ticketId, message } | null
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);
  const navigate = useNavigate();
  const prevDistrictRef = useRef('');
  const prevFacilityTypeRef = useRef('');

  useEffect(() => {
    setFacilityError('');
    getDistricts()
      .then(r => setDistricts(r.data || []))
      .catch(err => {
        console.error('Failed to load districts:', err);
        setFacilityError('Unable to load facilities. Please check your connection and try again.');
      });
  }, []);
  useEffect(() => {
    prevDistrictRef.current = form.district || '';
    prevFacilityTypeRef.current = form.facilityType || '';
  }, []);
  useEffect(() => {
    if (form.district) {
      setFacilityError('');
      getFacilityTypes(form.district)
        .then(r => setFacilityTypes(r.data || []))
        .catch(() => setFacilityTypes([]));
      if (prevDistrictRef.current && prevDistrictRef.current !== form.district) {
        setForm(f => ({ ...f, facilityType: '', facilityCode: '', facilityName: '' }));
        setFacilities([]);
      }
      prevDistrictRef.current = form.district;
    } else {
      setFacilityTypes([]);
      prevDistrictRef.current = '';
    }
  }, [form.district]);
  useEffect(() => {
    if (form.district && form.facilityType) {
      getFacilities(form.district, form.facilityType)
        .then(r => setFacilities(r.data || []))
        .catch(() => setFacilities([]));
      if (prevFacilityTypeRef.current && prevFacilityTypeRef.current !== form.facilityType) {
        setForm(f => ({ ...f, facilityCode: '', facilityName: '' }));
      }
      prevFacilityTypeRef.current = form.facilityType;
    } else {
      setFacilities([]);
      prevFacilityTypeRef.current = '';
    }
  }, [form.district, form.facilityType]);
  useEffect(() => {
    const payload = { step, form, emailVerified };
    localStorage.setItem(COMPLAINT_DRAFT_KEY, JSON.stringify(payload));
  }, [step, form, emailVerified]);

  // Reset the duplicate warning whenever facility or issue selection changes,
  // so a stale "duplicate found" banner doesn't linger after the user edits their selection.
  useEffect(() => {
    setDuplicateCheck(null);
    setDuplicateDismissed(false);
  }, [form.facilityCode, form.issueCategory]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'email') {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpInput('');
      setOtpError('');
    }
  };

  const validate0 = () => {
    const e = {};
    if (!form.district) e.district = 'Select a district';
    if (!form.facilityType) e.facilityType = 'Select facility type';
    if (!form.facilityCode) e.facilityCode = 'Select a health facility';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validate1 = () => {
    const e = {};
    if (!form.userName.trim()) e.userName = 'Name is required';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter valid 10-digit mobile number';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter valid email address';
    if (!emailVerified) e.emailVerify = 'Please verify your email with OTP';
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const validate2 = () => {
    if (!form.issueCategory.length) { setErrors({ issueCategory: 'Select at least one issue' }); return false; }
    setErrors({});
    return true;
  };

  const toggleIssue = (id) => {
    setForm(f => {
      const current = f.issueCategory;
      const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...f, issueCategory: next };
    });
    setErrors(e => ({ ...e, issueCategory: undefined }));
  };

  // FEATURE: Pre-submit duplicate check, run right after Issue selection (Step 2),
  // before the user proceeds to Confirm. Non-blocking by default — just a clear warning.
 const runDuplicateCheck = async () => {

  if (!form.facilityCode || form.issueCategory.length === 0)
    return false;

  setDuplicateChecking(true);

  try {

    const res = await checkDuplicateComplaint(
      form.facilityCode,
      form.issueCategory
    );

    if (res.data?.duplicate) {

      setDuplicateCheck({
        ticketId: res.data.ticketId,
        status: res.data.status,
        message: res.data.message
      });

      toast.error(
        `Complaint already registered.\nTicket : ${res.data.ticketId}`,
        { duration: 6000 }
      );

      return true;
    }

    setDuplicateCheck(null);

    return false;

  } catch (err) {

    console.error(err);

    return false;

  } finally {

    setDuplicateChecking(false);

  }

};

  const next = async () => {

  const valid = [validate0, validate1, validate2][step]?.();

  if (valid === false)
    return;

  // When leaving Issue step
  if (step === 2) {

    const duplicate = await runDuplicateCheck();

    if (duplicate) {
      return;
    }

  }

  setStep(s => s + 1);

};
  const back = () => setStep(s => s - 1);
  const resetForm = () => {
    setStep(0);
    setForm(INITIAL_FORM);
    setErrors({});
    setFacilityError('');
    setEmailVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setOtpError('');
    setImageError('');
    setDuplicateCheck(null);
    setDuplicateDismissed(false);
    localStorage.removeItem(COMPLAINT_DRAFT_KEY);
    toast.success('Form cleared successfully.');
  };

  const handleSendOTP = async () => {
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setErrors({ email: 'Enter valid email address first' });
      toast.error('Enter a valid email first.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      await sendEmailOTP(form.email);
      setOtpSent(true);
      setOtpInput('');
      setErrors(e => ({ ...e, email: undefined }));
      toast.success('OTP sent to your email.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Try again.';
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const current = form.attachmentUrls?.length || 0;
    const toAdd = Math.min(files.length, 2 - current);
    if (toAdd <= 0) {
      setImageError('Maximum 2 images allowed');
      toast.error('Maximum 2 images allowed.');
      return;
    }
    const selected = files.slice(0, toAdd).filter(f => f.type.startsWith('image/'));
    if (selected.length === 0) {
      setImageError('Please select image files (JPEG, PNG, GIF, WebP)');
      toast.error('Please select valid image files.');
      return;
    }
    setImageUploading(true);
    setImageError('');
    try {
      const compressed = [];
      for (const file of selected) {
        const c = await compressImageToLimit(file);
        compressed.push(c);
      }
      const res = await uploadComplaintImages(compressed);
      const urls = res.data?.urls || [];
      setForm(f => ({ ...f, attachmentUrls: [...(f.attachmentUrls || []), ...urls].slice(0, 2) }));
      toast.success('Image uploaded.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload images. Try again.';
      setImageError(msg);
      toast.error(msg);
    } finally {
      setImageUploading(false);
    }
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, attachmentUrls: (f.attachmentUrls || []).filter((_, i) => i !== idx) }));
    setImageError('');
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 6) {
      setOtpError('Enter the 6-digit OTP');
      toast.error('Enter a valid 6-digit OTP.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      await verifyEmailOTP(form.email, otpInput);
      setEmailVerified(true);
      setOtpError('');
      setErrors(e => ({ ...e, emailVerify: undefined }));
      toast.success('Email verified successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Try again.';
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return; // guard against double-click / double-submit
    setLoading(true);
    try {
      const res = await submitComplaint(form);

      if (res.data?.duplicate) {
        // Authoritative server-side check caught a duplicate even if the earlier
        // pre-check missed it (e.g. someone else registered one in between).
        localStorage.removeItem(COMPLAINT_DRAFT_KEY);
        localStorage.setItem('trackEmail', (form.email || '').toLowerCase().trim());
        localStorage.setItem('trackMobile', (form.mobile || '').trim());
        setSubmitted({ ticketId: res.data.ticketId, isDuplicate: true });
        toast(res.data.message || 'Complaint already exists.', { icon: 'ℹ️' });
        return;
      }

      localStorage.removeItem(COMPLAINT_DRAFT_KEY);
      // Prefill tracking contact without exposing ticket id in URL.
      localStorage.setItem('trackEmail', (form.email || '').toLowerCase().trim());
      localStorage.setItem('trackMobile', (form.mobile || '').trim());
      setSubmitted(res.data);
      toast.success('Complaint submitted successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Try again.';
      setErrors({ submit: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-wrapper">
        <div className="home-gradient-wrap">
        <Navbar />
        <HomeHeroBanner />
        <div className="home-success-area">
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <div className="card-body success-box">
              <div className="success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A7A4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2>{submitted.isDuplicate ? 'Complaint Already Registered' : 'Complaint Registered!'}</h2>
              <p className="text-muted mt-1">
                {submitted.isDuplicate
                  ? 'A similar complaint for this facility and issue is already open. Here is your existing ticket ID.'
                  : 'Your issue has been submitted. Please save your ticket ID to track the status.'}
              </p>
              <div className="ticket-id-display">
                <div className="ticket-id-label">{submitted.isDuplicate ? 'Existing Ticket ID' : 'Your Ticket ID'}</div>
                <div className="ticket-id-value">{submitted.ticketId}</div>
              </div>
              <div className="flex gap-2 mt-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => navigate('/track')}>Track Status</button>
                <button className="btn btn-primary" onClick={() => { setSubmitted(null); setStep(0); setForm(INITIAL_FORM); setEmailVerified(false); setOtpSent(false); setOtpInput(''); setOtpError(''); setImageError(''); setDuplicateCheck(null); setDuplicateDismissed(false); localStorage.removeItem(COMPLAINT_DRAFT_KEY); localStorage.removeItem('trackEmail'); localStorage.removeItem('trackMobile'); }}>New Complaint</button>
              </div>
            </div>
          </div>
        </div>
        </div>{/* home-gradient-wrap */}
        <PublicFooter />
      </div>
    );
  }

  const scrollToForm = () => {
    document.getElementById('complaint-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page-wrapper">
      <div className="home-gradient-wrap">
      <Navbar />
      <HomeHeroBanner />
      <div className="home-public-bg">
        <div className="home-flow-shell">
          <section className="report-cta-card" aria-label="Report or track complaint">
            <div className="report-cta-inner">
              <div className="report-cta-copy">
                <div className="report-cta-heading-row">
                  <h2 className="report-cta-title">Report WiFi Issue</h2>
                  <ReportWifiBadge variant="inline" />
                </div>
                <p className="report-cta-desc">
                  Facing internet issues at your health facility? Raise a complaint in seconds.
                </p>
                <div className="report-cta-buttons">
                  <button
                    type="button"
                    className="btn-report-primary"
                    onClick={() => { setStep(0); scrollToForm(); }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                    Report New Issue
                  </button>
                  <button type="button" className="btn-report-secondary" onClick={() => navigate('/track')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    Track Complaint
                  </button>
                </div>
              </div>
              <ReportWifiBadge variant="side" />
            </div>
          </section>

          <div id="complaint-flow" className="home-inner-elevated">
            <StepIndicator current={step} />

            <div className="complaint-form-shell complaint-form-shell--nested">
              <div className="complaint-form-card complaint-form-card--nested">
                <div className="card-body">
            {/* Step 0: Facility Selection */}
            {step === 0 && (
              <div>
                <h3 className="complaint-step-heading">Select Health Facility</h3>
                {facilityError && <div className="alert alert-error mb-3">{facilityError}</div>}
                <div className="form-group">
                  <div className="form-label-row">
                    <span className="label-icon" aria-hidden>📍</span>
                    <span>District <span className="req">*</span></span>
                  </div>
                  <div className="field-select-wrap">
                    <span className="field-select-wrap__icon" aria-hidden>🔍</span>
                    <select className="form-control" value={form.district} onChange={e => set('district', e.target.value)} aria-label="Select district">
                      <option value="">Select District</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {errors.district && <div className="form-error">{errors.district}</div>}
                </div>
                <div className="form-group">
                  <div className="form-label-row">
                    <span className="label-icon" aria-hidden>🏥</span>
                    <span>Facility Type <span className="req">*</span></span>
                  </div>
                  <div className="field-select-wrap">
                    <span className="field-select-wrap__icon" aria-hidden>🏢</span>
                    <select className="form-control" value={form.facilityType} onChange={e => set('facilityType', e.target.value)} disabled={!form.district} aria-label="Select facility type">
                      <option value="">Select Type</option>
                      {facilityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {errors.facilityType && <div className="form-error">{errors.facilityType}</div>}
                </div>
                <div className="form-group">
                  <div className="form-label-row">
                    <span className="label-icon" aria-hidden>🏥</span>
                    <span>Health Facility <span className="req">*</span></span>
                  </div>
                  <div className="field-select-wrap">
                    <span className="field-select-wrap__icon" aria-hidden>🔍</span>
                    <select className="form-control" value={form.facilityCode} onChange={e => {
                      const fac = facilities.find(f => f.facility_code === e.target.value);
                      set('facilityCode', e.target.value);
                      set('facilityName', fac?.facility_name || '');
                    }} disabled={!form.facilityType} aria-label="Select health facility">
                      <option value="">Select Facility</option>
                      {facilities.map(f => <option key={f.facility_code} value={f.facility_code}>{f.facility_name}</option>)}
                    </select>
                  </div>
                  {errors.facilityCode && <div className="form-error">{errors.facilityCode}</div>}
                </div>
              </div>
            )}

            {/* Step 1: User Details */}
            {step === 1 && (
              <div>
                <h3 className="complaint-step-heading">Your Contact Details</h3>
                <div className="form-group">
                  <label className="form-label">Full Name <span className="req">*</span></label>
                  <input className="form-control" placeholder="e.g. Rajesh Kumar" value={form.userName} onChange={e => set('userName', e.target.value)} />
                  {errors.userName && <div className="form-error">{errors.userName}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number <span className="req">*</span></label>
                  <input className="form-control" placeholder="10-digit mobile" maxLength={10} value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/,''))} />
                  {errors.mobile && <div className="form-error">{errors.mobile}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="req">*</span></label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      style={{ flex: '1 1 200px' }}
                      disabled={emailVerified}
                    />
                    {!emailVerified && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleSendOTP}
                        disabled={otpLoading || !/\S+@\S+\.\S+/.test(form.email)}
                      >
                        {otpLoading && !otpSent ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending...</> : otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    )}
                    {emailVerified && <span style={{ color: 'var(--green-600)', fontWeight: 600, alignSelf: 'center' }}>✓ Verified</span>}
                  </div>
                  {errors.email && <div className="form-error">{errors.email}</div>}
                  {errors.emailVerify && <div className="form-error">{errors.emailVerify}</div>}
                  {otpSent && !emailVerified && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        className="form-control"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        value={otpInput}
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        style={{ width: 140 }}
                      />
                      <button type="button" className="btn btn-primary" onClick={handleVerifyOTP} disabled={otpLoading || otpInput.length !== 6}>
                        {otpLoading && otpInput.length === 6 ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Verifying...</> : 'Verify'}
                      </button>
                    </div>
                  )}
                  {otpError && <div className="form-error" style={{ marginTop: 8 }}>{otpError}</div>}
                </div>
              </div>
            )}

            {/* Step 2: Issue Selection */}
            {step === 2 && (
              <div>
                <h3 className="complaint-step-heading">What&apos;s the Issue?</h3>
                <p className="text-sm text-muted mb-2" style={{ marginTop: -4 }}>You can select more than one.</p>
                {errors.issueCategory && <div className="alert alert-error">{errors.issueCategory}</div>}
                <div className="issue-grid">
                  {ISSUES.map(issue => (
                    <div
                      key={issue.id}
                      className={`issue-card ${form.issueCategory.includes(issue.id) ? 'selected' : ''}`}
                      onClick={() => toggleIssue(issue.id)}
                      role="checkbox"
                      aria-checked={form.issueCategory.includes(issue.id)}
                    >
                      <div className="issue-card-icon">{issue.icon}</div>
                      <div>
                        <div className="issue-card-title">{issue.title}</div>
                        <div className="issue-card-desc">{issue.desc}</div>
                      </div>
                      {form.issueCategory.includes(issue.id) && (
                        <span className="issue-card-check" aria-hidden>✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="form-group mt-3">
                  <label className="form-label">Additional Details (Optional)</label>
                  <textarea className="form-control" rows={3} placeholder="Describe the issue in more detail..." value={form.issueDescription} onChange={e => set('issueDescription', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-group mt-3">
                  <label className="form-label">Attach Images (Optional, max 2)</label>
                  <p className="text-sm text-muted mb-2">Screenshots or photos of the issue – JPEG, PNG, GIF, WebP up to 5MB each</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                    {(form.attachmentUrls || []).map((url, i) => (
                      <div key={i} style={{ position: 'relative', flex: '0 0 auto' }}>
                        <img src={url} alt={`Attachment ${i + 1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }} />
                        <button type="button" onClick={() => removeImage(i)} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: -4, right: -4, padding: 4, minWidth: 0, background: 'var(--gray-100)', borderRadius: '50%' }} aria-label="Remove">×</button>
                      </div>
                    ))}
                    {(form.attachmentUrls || []).length < 2 && (
                      <label className="btn btn-outline" style={{ margin: 0, cursor: imageUploading ? 'not-allowed' : 'pointer' }}>
                        {imageUploading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading...</> : '📷 Add Image'}
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple style={{ display: 'none' }} onChange={handleImageSelect} disabled={imageUploading} />
                      </label>
                    )}
                  </div>
                  {imageError && <div className="form-error mt-2">{imageError}</div>}
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div>
                <h3 className="complaint-step-heading">Confirm Your Complaint</h3>
                {errors.submit && <div className="alert alert-error">{errors.submit}</div>}

                {duplicateCheck && !duplicateDismissed && (
                  <div className="alert alert-info mb-3" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <strong>Similar complaint already registered.</strong>
                      <div className="text-sm mt-1">{duplicateCheck.message}</div>
                      <div className="text-sm mt-1">Existing Ticket ID: <strong>{duplicateCheck.ticketId}</strong></div>
                    </div>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          localStorage.setItem('trackEmail', (form.email || '').toLowerCase().trim());
                          localStorage.setItem('trackMobile', (form.mobile || '').trim());
                          navigate('/track');
                        }}
                      >
                        Track This Ticket
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDuplicateDismissed(true)}
                      >
                        This is a different issue — Continue Anyway
                      </button>
                    </div>
                  </div>
                )}

                <div className="card" style={{ background: 'var(--gray-50)', marginBottom: 20 }}>
                  <div className="card-body" style={{ padding: 20 }}>
                    <div className="grid-2" style={{ gap: 12 }}>
                      {[
                        ['Name', form.userName],
                        ['Mobile', form.mobile],
                        ['Email', form.email],
                        ['District', form.district],
                        ['Facility Type', form.facilityType],
                        ['Facility', form.facilityName],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--gray-700)', marginTop: 2 }}>{v}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue{form.issueCategory.length > 1 ? 's' : ''}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {form.issueCategory.map(iss => (
                            <span key={iss} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>{iss}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {form.issueDescription && (
                      <div className="mt-2">
                        <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</div>
                        <div className="text-sm" style={{ color: 'var(--gray-700)', marginTop: 2 }}>{form.issueDescription}</div>
                      </div>
                    )}
                    {(form.attachmentUrls || []).length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          {(form.attachmentUrls || []).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                              <img src={url} alt={`Attachment ${i + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--gray-200)' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted">By submitting, you confirm the above details are correct. You will receive a ticket ID for tracking.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="complaint-footer-actions">
              {step > 0 ? (
                <button type="button" className="btn btn-ghost complaint-back-btn" onClick={back}>
                  ← Back
                </button>
              ) : (
                <span className="complaint-back-btn" />
              )}
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Reset Form
              </button>
              {step < 3 ? (
                <button type="button" className="btn btn-primary complaint-primary-action" onClick={next} disabled={duplicateChecking}>
                  {duplicateChecking ? <><span className="spinner" /> Checking...</> : 'Continue'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary complaint-primary-action"
                  onClick={handleSubmit}
                  disabled={loading || (duplicateCheck && !duplicateDismissed)}
                >
                  {loading ? <><span className="spinner" /> Submitting...</> : '✓ Submit Complaint'}
                </button>
              )}
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* home-gradient-wrap */}
      <PublicFooter />
    </div>
  );
}