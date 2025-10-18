/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { createRoot } from 'react-dom/client';

type MemberStatus = 'Active' | 'Inactive' | 'Pending';

interface Member {
  name: string;
  role: string;
  bio: string;
  imageUrl?: string;
  status: MemberStatus;
  affiliations: string[];
}

interface FormErrors {
    name?: string;
    role?: string;
    bio?: string;
    imageUrl?: string;
}

const generateAvatar = (name: string): string => {
    if (!name) return '';
  
    const initial = name.charAt(0).toUpperCase();
    
    // Simple hash function to get a color from a predefined palette
    const colors = [
      '#4a90e2', '#50e3c2', '#bd10e0', '#f5a623', '#f8e71c', 
      '#7ed321', '#9013fe', '#b8e986', '#417505', '#d0021b'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
  
    const svg = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" />
        <text
          x="50%"
          y="50%"
          dominant-baseline="central"
          text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          font-size="100"
          font-weight="bold"
          fill="#ffffff"
        >
          ${initial}
        </text>
      </svg>
    `;
  
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};


const App = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Active');
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [currentAffiliation, setCurrentAffiliation] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedMembers = localStorage.getItem('communityMembers');
      if (storedMembers) {
        setMembers(JSON.parse(storedMembers));
      }
    } catch (error) {
      console.error('Failed to parse members from localStorage', error);
      localStorage.removeItem('communityMembers');
    }
  }, []);
  
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
        videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCameraOpen) {
          closeCamera();
        } else if (selectedMember) {
          setSelectedMember(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCameraOpen, selectedMember]);


  const resetForm = () => {
    setName('');
    setRole('');
    setBio('');
    setImageUrl('');
    setStatus('Active');
    setAffiliations([]);
    setCurrentAffiliation('');
    setEditingIndex(null);
    setErrors({});
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!role.trim()) newErrors.role = 'Role is required.';
    if (!bio.trim()) newErrors.bio = 'Bio is required.';
    if (imageUrl) {
        // Simple regex to check for http(s) or data URL
        const urlRegex = /^(https?:\/\/|data:image\/).+/;
        if (!urlRegex.test(imageUrl)) {
            newErrors.imageUrl = 'Please enter a valid URL (starting with http://, https://, or data:image/).';
        }
    }
    return newErrors;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
    }

    const memberData: Member = { name, role, bio, imageUrl, status, affiliations };
    let updatedMembers: Member[];

    if (editingIndex !== null) {
      updatedMembers = members.map((member, index) =>
        index === editingIndex ? memberData : member
      );
    } else {
      updatedMembers = [...members, memberData];
      setSortOrder(null); // Reset sort when a new member is added
    }
    
    setMembers(updatedMembers);
    localStorage.setItem('communityMembers', JSON.stringify(updatedMembers));
    resetForm();
  };
  
  const handleEdit = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const memberToEdit = members[index];
    setName(memberToEdit.name);
    setRole(memberToEdit.role);
    setBio(memberToEdit.bio);
    setImageUrl(memberToEdit.imageUrl || '');
    setStatus(memberToEdit.status || 'Active');
    setAffiliations(memberToEdit.affiliations || []);
    setEditingIndex(index);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${members[indexToDelete].name}?`)) {
        setDeletingIndex(indexToDelete);

        // Wait for animation to finish before removing from state
        setTimeout(() => {
            const updatedMembers = members.filter((_, index) => index !== indexToDelete);
            setMembers(updatedMembers);
            localStorage.setItem('communityMembers', JSON.stringify(updatedMembers));
            
            if (editingIndex === indexToDelete) {
                resetForm();
            }
            setDeletingIndex(null);
        }, 400); // Must match animation duration in CSS
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
           if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async () => {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(mediaStream);
        setIsCameraOpen(true);
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access the camera. Please check permissions and try again.");
    }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageUrl(dataUrl);
        if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
        closeCamera();
    }
  };

  const handleSort = (direction: 'asc' | 'desc') => {
    const sortedMembers = [...members].sort((a, b) => {
      if (direction === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setMembers(sortedMembers);
    setSortOrder(direction);
  };

  const handleAddAffiliation = () => {
    if (currentAffiliation.trim() && !affiliations.includes(currentAffiliation.trim())) {
      setAffiliations([...affiliations, currentAffiliation.trim()]);
      setCurrentAffiliation('');
    }
  };

  const handleRemoveAffiliation = (indexToRemove: number) => {
    setAffiliations(affiliations.filter((_, index) => index !== indexToRemove));
  };


  const filteredMembers = members.filter(member => {
    const term = searchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(term) ||
      member.role.toLowerCase().includes(term) ||
      member.bio.toLowerCase().includes(term) ||
      (member.affiliations && member.affiliations.some(aff => aff.toLowerCase().includes(term)))
    );
  });

  return (
    <main>
      <header>
        <h1>Community Members</h1>
      </header>
      <section className="form-section" aria-labelledby="form-heading">
        <h2 id="form-heading">{editingIndex !== null ? 'Edit Member' : 'Add a New Member'}</h2>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g., Jane Doe"
              required
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby="name-error"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <p id="name-error" className="error-message">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
              }}
              placeholder="e.g., Software Engineer"
              required
              aria-required="true"
              aria-invalid={!!errors.role}
              aria-describedby="role-error"
              className={errors.role ? 'error' : ''}
            />
            {errors.role && <p id="role-error" className="error-message">{errors.role}</p>}
          </div>
           <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (errors.bio) setErrors(prev => ({ ...prev, bio: undefined }));
              }}
              placeholder="A short biography..."
              required
              aria-required="true"
              rows={4}
              aria-invalid={!!errors.bio}
              aria-describedby="bio-error"
              className={errors.bio ? 'error' : ''}
            ></textarea>
             {errors.bio && <p id="bio-error" className="error-message">{errors.bio}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="affiliation-input">Affiliations (Optional)</label>
            <div className="form-group-inline">
              <input
                id="affiliation-input"
                type="text"
                value={currentAffiliation}
                onChange={(e) => setCurrentAffiliation(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAffiliation();
                    }
                }}
                placeholder="e.g., University, Company"
              />
              <button type="button" className="add-button" onClick={handleAddAffiliation}>Add</button>
            </div>
            {affiliations.length > 0 && (
              <ul className="affiliation-tags-list">
                {affiliations.map((aff, index) => (
                  <li key={index} className="affiliation-tag">
                    {aff}
                    <button type="button" onClick={() => handleRemoveAffiliation(index)} className="remove-tag-button" aria-label={`Remove ${aff}`}>
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="imageUrl">Profile Picture (Optional)</label>
            <div className="image-input-group">
                <input
                id="imageUrl"
                type="text"
                value={imageUrl}
                onChange={(e) => {
                    setImageUrl(e.target.value);
                    if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined }));
                }}
                placeholder="Paste URL, upload, or take a photo"
                aria-invalid={!!errors.imageUrl}
                aria-describedby="imageUrl-error"
                className={errors.imageUrl ? 'error' : ''}
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    aria-hidden="true"
                />
                <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()} aria-label="Upload an image file">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 16h6v-6h4l-8-8-8 8h4v6zm-4 2h14v-2H5v2z"/></svg>
                </button>
                <button type="button" className="camera-button" onClick={openCamera} aria-label="Take a photo">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9.4 11.7h5.2v-5H9.4v5Zm-2.7 5h10.6c.9 0 1.7-.8 1.7-1.7V8.4c0-.9-.8-1.7-1.7-1.7H14l-1.7-1.7H9L7.3 6.7H4c-.9 0-1.7.8-1.7 1.7v6.6c0 .9.8 1.7 1.7 1.7ZM12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0Zm5.3 16.7c0 1.8-1.5 3.3-3.3 3.3H10c-1.8 0-3.3-1.5-3.3-3.3V8.4c0-1.8 1.5-3.3 3.3-3.3h.6L12 4.4l1.4.7h.6c1.8 0 3.3 1.5 3.3 3.3v8.3Z"/></svg>
                </button>
            </div>
             {errors.imageUrl && <p id="imageUrl-error" className="error-message">{errors.imageUrl}</p>}
            {imageUrl && !errors.imageUrl && (
                <div className="image-preview-container">
                    <p>Preview:</p>
                    <img src={imageUrl} alt="Profile preview" className="form-image-preview"/>
                </div>
            )}
          </div>
          <div className="form-controls">
            <button type="submit">{editingIndex !== null ? 'Update Member' : 'Add Member'}</button>
            {editingIndex !== null && (
              <button type="button" onClick={resetForm} className="cancel-button">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="members-section" aria-labelledby="members-heading">
        <div className="section-header">
            <h2 id="members-heading">Our Community</h2>
            {members.length > 0 && (
              <span className="member-count">
                ({filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found)
              </span>
            )}
        </div>
        <div className="members-controls">
            <div className="search-bar">
                <label htmlFor="search-members" className="visually-hidden">Search Members</label>
                <input
                    id="search-members"
                    type="search"
                    placeholder="Search by name, role, bio, or affiliation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-controls="members-grid"
                />
            </div>
            {members.length > 1 && (
                <div className="sort-controls">
                    <button
                        type="button"
                        onClick={() => handleSort('asc')}
                        className={`sort-button ${sortOrder === 'asc' ? 'active' : ''}`}
                        aria-pressed={sortOrder === 'asc'}
                        title="Sort by name, ascending"
                    >
                        A-Z ↓
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSort('desc')}
                        className={`sort-button ${sortOrder === 'desc' ? 'active' : ''}`}
                        aria-pressed={sortOrder === 'desc'}
                        title="Sort by name, descending"
                    >
                        Z-A ↑
                    </button>
                </div>
            )}
        </div>
        {members.length === 0 ? (
          <p>No members yet. Add one above!</p>
        ) : filteredMembers.length === 0 ? (
            <p>No members found matching your search.</p>
        ) : (
          <div className="members-grid" id="members-grid">
            {filteredMembers.map((member) => {
              const originalIndex = members.indexOf(member);
              const isDeleting = originalIndex === deletingIndex;
              return (
                <article
                  key={originalIndex}
                  className={`member-card ${isDeleting ? 'exiting' : ''}`}
                  onClick={() => setSelectedMember(member)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMember(member);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-haspopup="dialog"
                  aria-label={`View details for ${member.name}`}
                >
                  <img
                      src={member.imageUrl || generateAvatar(member.name)}
                      alt={`Profile of ${member.name}`}
                      className="member-image"
                  />
                  <div className="member-card-content">
                    <div className="member-card-header">
                        <h3>{member.name}</h3>
                        <span className={`status-badge status-${member.status?.toLowerCase()}`}>{member.status}</span>
                    </div>
                    <p className="role">{member.role}</p>
                    {member.affiliations && member.affiliations.length > 0 && (
                        <div className="affiliations-list card-affiliations">
                            {member.affiliations.map((aff, index) => (
                                <span key={index} className="affiliation-tag-display">{aff}</span>
                            ))}
                        </div>
                    )}
                    <p>{member.bio}</p>
                    <div className="member-card-actions">
                      <button type="button" onClick={(e) => handleEdit(e, originalIndex)} className="edit-button">Edit</button>
                      <button type="button" onClick={(e) => handleDelete(e, originalIndex)} className="delete-button">Delete</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {isCameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">
            <div className="camera-modal-content">
                <h3 id="camera-modal-title" className="visually-hidden">Camera View</h3>
                <video ref={videoRef} autoPlay playsInline className="camera-feed" />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="camera-controls">
                    <button type="button" onClick={capturePhoto}>Capture Photo</button>
                    <button type="button" onClick={closeCamera} className="close-button">Cancel</button>
                </div>
            </div>
        </div>
      )}
      {selectedMember && (
        <div 
          className="member-detail-modal" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="member-detail-title"
          onClick={() => setSelectedMember(null)}
        >
          <div className="member-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="close-modal-button" 
              onClick={() => setSelectedMember(null)}
              aria-label="Close member details"
            >
              &times;
            </button>
            <img 
              src={selectedMember.imageUrl || generateAvatar(selectedMember.name)} 
              alt={`Profile of ${selectedMember.name}`}
              className="member-detail-image"
            />
            <h3 id="member-detail-title">{selectedMember.name}</h3>
            <span className={`status-badge status-${selectedMember.status?.toLowerCase()}`}>{selectedMember.status}</span>
            <p className="role">{selectedMember.role}</p>
            {selectedMember.affiliations && selectedMember.affiliations.length > 0 && (
                <div className="affiliations-list modal-affiliations">
                    <h4>Affiliations</h4>
                    <ul>
                        {selectedMember.affiliations.map((aff, index) => (
                            <li key={index}>{aff}</li>
                        ))}
                    </ul>
                </div>
            )}
            <p>{selectedMember.bio}</p>
          </div>
        </div>
      )}
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}