/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

type MemberStatus = 'Active' | 'Inactive' | 'Pending';
type UserRole = 'Admin' | 'Member';

interface Member {
  name: string;
  role: string;
  bio: string;
  imageUrl?: string;
  status: MemberStatus;
  affiliations: string[];
  group?: string;
  dateJoined?: string;
  lastActive?: string;
  activityLog?: { timestamp: string; event: string; }[];
}

interface FormErrors {
    name?: string;
    role?: string;
    bio?: string;
    imageUrl?: string;
}

interface ImportData {
    members: Member[];
    groups: string[];
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

const getTodayString = () => new Date().toISOString().split('T')[0];


const App = () => {
  const [members, setMembers] = useState<Member[]>([]);
  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Active');
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [currentAffiliation, setCurrentAffiliation] = useState('');
  const [group, setGroup] = useState('');
  const [dateJoined, setDateJoined] = useState(getTodayString());


  // UI State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isRecentSearchesOpen, setIsRecentSearchesOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'All'>('All');
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([]);
  const [isAffiliationFilterOpen, setIsAffiliationFilterOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFileData, setImportFileData] = useState<ImportData | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);


  // Group Management State
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');

  // Role Management State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const affiliationFilterRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedMembers = localStorage.getItem('communityMembers');
      if (storedMembers) setMembers(JSON.parse(storedMembers));
      
      const storedGroups = localStorage.getItem('communityGroups');
      if (storedGroups) setGroups(JSON.parse(storedGroups));

      const storedUserRole = localStorage.getItem('communityUserRole');
      if (storedUserRole === 'Admin' || storedUserRole === 'Member') {
          setCurrentUserRole(storedUserRole);
      }
      
      const storedSearches = localStorage.getItem('communityRecentSearches');
      if (storedSearches) setRecentSearches(JSON.parse(storedSearches));


    } catch (error) {
      console.error('Failed to parse data from localStorage', error);
      localStorage.removeItem('communityMembers');
      localStorage.removeItem('communityGroups');
      localStorage.removeItem('communityUserRole');
      localStorage.removeItem('communityRecentSearches');
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
        if (isDashboardOpen) setIsDashboardOpen(false);
        else if (isCameraOpen) closeCamera();
        else if (selectedMember) setSelectedMember(null);
        else if (isAffiliationFilterOpen) setIsAffiliationFilterOpen(false);
        else if (isRecentSearchesOpen) setIsRecentSearchesOpen(false);
        else if (showExportConfirm) setShowExportConfirm(false);
        else if (showImportConfirm) {
            setShowImportConfirm(false);
            setImportFileData(null);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const handleClickOutside = (event: MouseEvent) => {
      if (affiliationFilterRef.current && !affiliationFilterRef.current.contains(event.target as Node)) {
        setIsAffiliationFilterOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsRecentSearchesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCameraOpen, selectedMember, isAffiliationFilterOpen, isRecentSearchesOpen, showExportConfirm, showImportConfirm, isDashboardOpen]);


  const resetForm = () => {
    setName('');
    setRole('');
    setBio('');
    setImageUrl('');
    setStatus('Active');
    setAffiliations([]);
    setCurrentAffiliation('');
    setGroup('');
    setDateJoined(getTodayString());
    setEditingIndex(null);
    setErrors({});
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required.';
    if (!role.trim()) newErrors.role = 'Role is required.';
    if (!bio.trim()) newErrors.bio = 'Bio is required.';
    if (imageUrl) {
        const urlRegex = /^(https?:\/\/|data:image\/).+/;
        if (!urlRegex.test(imageUrl)) {
            newErrors.imageUrl = 'Please enter a valid URL (starting with http://, https://, or data:image/).';
        }
    }
    return newErrors;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') return; // Security check

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
    }

    const todayISO = new Date().toISOString();
    const finalDateJoined = dateJoined ? new Date(dateJoined).toISOString() : todayISO;
    
    let memberData: Member;
    let updatedMembers: Member[];

    if (editingIndex !== null) {
      const originalMember = members[editingIndex];
      const newActivityLog = originalMember.activityLog ? [...originalMember.activityLog] : [];
      
      // Log status change
      if (originalMember.status !== status) {
        newActivityLog.unshift({
            timestamp: todayISO,
            event: `Status changed from '${originalMember.status}' to '${status}'.`
        });
      }
      // Log group change
      const originalGroup = originalMember.group || 'Unassigned';
      const newGroup = group || 'Unassigned';
      if (originalGroup !== newGroup) {
        newActivityLog.unshift({
            timestamp: todayISO,
            event: `Moved from group '${originalGroup}' to '${newGroup}'.`
        });
      }
      // Log other granular field changes
      const originalDate = originalMember.dateJoined ? new Date(originalMember.dateJoined).toISOString().split('T')[0] : '';
      const newDate = dateJoined ? new Date(dateJoined).toISOString().split('T')[0] : '';
      if (originalDate !== newDate) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Date joined changed to ${new Date(dateJoined).toLocaleDateString()}.` });
      }
      if (JSON.stringify(originalMember.affiliations.sort()) !== JSON.stringify(affiliations.sort())) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Affiliations were updated.` });
      }
      if (originalMember.imageUrl !== imageUrl) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Profile picture was updated.` });
      }
      if (originalMember.bio !== bio) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Bio was updated.` });
      }
      if (originalMember.role !== role) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Role changed to "${role}".` });
      }
      if (originalMember.name !== name) {
        newActivityLog.unshift({ timestamp: todayISO, event: `Name changed to "${name}".` });
      }

      memberData = { 
          name, role, bio, imageUrl, status, affiliations, group, 
          dateJoined: finalDateJoined || originalMember.dateJoined,
          lastActive: todayISO, // Always update last active on edit
          activityLog: newActivityLog,
      };
      updatedMembers = members.map((member, index) =>
        index === editingIndex ? memberData : member
      );
    } else {
      memberData = { 
          name, role, bio, imageUrl, status, affiliations, group, 
          dateJoined: finalDateJoined,
          lastActive: finalDateJoined, // On creation, last active is the same as date joined
          activityLog: [{ timestamp: finalDateJoined, event: 'Member created.' }],
      };
      updatedMembers = [...members, memberData];
      setSortOrder(null);
    }
    
    setMembers(updatedMembers);
    localStorage.setItem('communityMembers', JSON.stringify(updatedMembers));
    resetForm();
  };
  
  const handleEdit = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (currentUserRole !== 'Admin') return;
    const memberToEdit = members[index];
    setName(memberToEdit.name);
    setRole(memberToEdit.role);
    setBio(memberToEdit.bio);
    setImageUrl(memberToEdit.imageUrl || '');
    setStatus(memberToEdit.status || 'Active');
    setAffiliations(memberToEdit.affiliations || []);
    setGroup(memberToEdit.group || '');
    setDateJoined(memberToEdit.dateJoined ? memberToEdit.dateJoined.split('T')[0] : '');
    setEditingIndex(index);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation();
    if (currentUserRole !== 'Admin') return;
    if (window.confirm(`Are you sure you want to delete ${members[indexToDelete].name}?`)) {
        setDeletingIndex(indexToDelete);

        setTimeout(() => {
            const updatedMembers = members.filter((_, index) => index !== indexToDelete);
            setMembers(updatedMembers);
            localStorage.setItem('communityMembers', JSON.stringify(updatedMembers));
            
            if (editingIndex === indexToDelete) resetForm();
            setDeletingIndex(null);
        }, 400);
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
      if (direction === 'asc') return a.name.localeCompare(b.name);
      else return b.name.localeCompare(a.name);
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

  const handleAffiliationChange = (affiliation: string) => {
    setSelectedAffiliations(prev => 
      prev.includes(affiliation)
        ? prev.filter(a => a !== affiliation)
        : [...prev, affiliation]
    );
  };

  const handleAddGroup = () => {
    if (currentUserRole !== 'Admin') return;
    const trimmedName = newGroupName.trim();
    if (trimmedName && !groups.includes(trimmedName)) {
        const updatedGroups = [...groups, trimmedName];
        setGroups(updatedGroups);
        localStorage.setItem('communityGroups', JSON.stringify(updatedGroups));
        setNewGroupName('');
    }
  };

  const handleDeleteGroup = (groupToDelete: string) => {
      if (currentUserRole !== 'Admin') return;
      if (window.confirm(`Are you sure you want to delete the "${groupToDelete}" group? Members in this group will become unassigned.`)) {
          const updatedGroups = groups.filter(g => g !== groupToDelete);
          setGroups(updatedGroups);
          localStorage.setItem('communityGroups', JSON.stringify(updatedGroups));

          // Reassign members from the deleted group
          const updatedMembers = members.map(m => 
              m.group === groupToDelete ? { ...m, group: '' } : m
          );
          setMembers(updatedMembers);
          localStorage.setItem('communityMembers', JSON.stringify(updatedMembers));
      }
  };

  const executeExport = () => {
    if (currentUserRole !== 'Admin') return;
    const dataToExport = {
        members: members,
        groups: groups,
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `community-members-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportConfirm(false);
};

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (currentUserRole !== 'Admin') return;
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const result = event.target?.result;
              if (typeof result !== 'string') {
                  throw new Error("File could not be read.");
              }
              const data = JSON.parse(result);

              // Basic validation
              if (!data || !Array.isArray(data.members) || !Array.isArray(data.groups)) {
                  throw new Error("Invalid JSON format. The file must contain 'members' and 'groups' arrays.");
              }
              
              setImportFileData(data);
              setShowImportConfirm(true);

          } catch (error) {
              console.error("Failed to import data:", error);
              alert(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          } finally {
              if (e.target) {
                  e.target.value = '';
              }
          }
      };
      reader.readAsText(file);
  };

  const executeImport = () => {
    if (!importFileData) return;

    setMembers(importFileData.members);
    setGroups(importFileData.groups);

    localStorage.setItem('communityMembers', JSON.stringify(importFileData.members));
    localStorage.setItem('communityGroups', JSON.stringify(importFileData.groups));

    setShowImportConfirm(false);
    setImportFileData(null);
    alert("Data imported successfully!");
  };

  const handleRoleChange = (role: UserRole) => {
      setCurrentUserRole(role);
      localStorage.setItem('communityUserRole', role);
  }

  const addRecentSearch = (term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;
    
    const updatedSearches = [
        trimmedTerm,
        ...recentSearches.filter(s => s.toLowerCase() !== trimmedTerm.toLowerCase())
    ].slice(0, 5); // Keep the 5 most recent
    
    setRecentSearches(updatedSearches);
    localStorage.setItem('communityRecentSearches', JSON.stringify(updatedSearches));
  };

  const handleSelectRecentSearch = (term: string) => {
      setSearchTerm(term);
      setIsRecentSearchesOpen(false);
  };

  const handleClearRecentSearches = (e: React.MouseEvent) => {
      e.stopPropagation();
      setRecentSearches([]);
      localStorage.removeItem('communityRecentSearches');
      setIsRecentSearchesOpen(false);
  };

  const allAffiliations = useMemo(() => {
    const affiliationsSet = new Set<string>();
    members.forEach(member => {
      member.affiliations?.forEach(aff => affiliationsSet.add(aff));
    });
    return Array.from(affiliationsSet).sort((a, b) => a.localeCompare(b));
  }, [members]);


  const filteredMembers = members
    .filter(member => statusFilter === 'All' || member.status === statusFilter)
    .filter(member => selectedAffiliations.length === 0 || (member.affiliations && selectedAffiliations.some(filterAff => member.affiliations.includes(filterAff))))
    .filter(member => {
        const term = searchTerm.toLowerCase();
        return (
          member.name.toLowerCase().includes(term) ||
          member.role.toLowerCase().includes(term) ||
          member.bio.toLowerCase().includes(term) ||
          (member.affiliations && member.affiliations.some(aff => aff.toLowerCase().includes(term)))
        );
    });

  const groupedMembers = useMemo(() => {
    const grouped: { [key: string]: Member[] } = {};
    filteredMembers.forEach(member => {
        const groupName = member.group || 'Unassigned';
        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }
        grouped[groupName].push(member);
    });
    return grouped;
  }, [filteredMembers]);

  const sortedGroupNames = Object.keys(groupedMembers).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
  });

  const dashboardStats = useMemo(() => {
    if (!members || members.length === 0) return null;

    const statusCounts = {
      Active: members.filter(m => m.status === 'Active').length,
      Inactive: members.filter(m => m.status === 'Inactive').length,
      Pending: members.filter(m => m.status === 'Pending').length,
    };

    const groupCounts: { [key: string]: number } = {};
    groups.forEach(g => { groupCounts[g] = 0; });
    groupCounts['Unassigned'] = 0;

    let maxGroupCount = 0;
    members.forEach(m => {
      const groupName = m.group || 'Unassigned';
      if (groupCounts[groupName] !== undefined) {
        groupCounts[groupName]++;
      } else {
        groupCounts[groupName] = 1;
      }
      if (groupCounts[groupName] > maxGroupCount) {
        maxGroupCount = groupCounts[groupName];
      }
    });

    return {
      totalMembers: members.length,
      statusCounts,
      groupCounts,
      maxGroupCount,
    };
  }, [members, groups]);


  return (
    <main>
      <header>
        <h1>Community Members</h1>
      </header>
      <section className="role-switcher-section" aria-labelledby="role-switcher-heading">
          <h3 id="role-switcher-heading">Current User Role</h3>
          <div className="role-switcher">
              <button 
                  type="button" 
                  className={`role-button ${currentUserRole === 'Admin' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('Admin')}
                  aria-pressed={currentUserRole === 'Admin'}
                  title="Switch to Admin role"
              >
                  Admin
              </button>
              <button 
                  type="button" 
                  className={`role-button ${currentUserRole === 'Member' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('Member')}
                  aria-pressed={currentUserRole === 'Member'}
                  title="Switch to Member role"
              >
                  Member
              </button>
          </div>
          <p className="role-description">
              {currentUserRole === 'Admin' 
                  ? 'Admins can add, edit, delete members and manage groups and data.'
                  : 'Members have read-only access to the community list.'
              }
          </p>
      </section>

      {currentUserRole === 'Admin' && (
        <section className="admin-actions">
          <button type="button" onClick={() => setIsDashboardOpen(true)} title="Open the admin dashboard for community stats">View Dashboard</button>
        </section>
      )}

      {currentUserRole === 'Admin' && (
        <section className="form-section" aria-labelledby="form-heading">
          <h2 id="form-heading">{editingIndex !== null ? 'Edit Member' : 'Add a New Member'}</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <div className="input-wrapper">
                <input id="name" type="text" value={name} onChange={(e) => {setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));}} placeholder="e.g., Jane Doe" required aria-required="true" aria-invalid={!!errors.name} aria-describedby="name-error" className={errors.name ? 'error' : ''} />
                {errors.name && <div className="error-icon" aria-hidden="true">!</div>}
              </div>
              {errors.name && <p id="name-error" className="error-message">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <div className="input-wrapper">
                <input id="role" type="text" value={role} onChange={(e) => {setRole(e.target.value); if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));}} placeholder="e.g., Software Engineer" required aria-required="true" aria-invalid={!!errors.role} aria-describedby="role-error" className={errors.role ? 'error' : ''} />
                {errors.role && <div className="error-icon" aria-hidden="true">!</div>}
              </div>
              {errors.role && <p id="role-error" className="error-message">{errors.role}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)} >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="form-group">
                <label htmlFor="group">Group (Optional)</label>
                <select id="group" value={group} onChange={(e) => setGroup(e.target.value)}>
                    <option value="">Unassigned</option>
                    {groups.sort().map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="form-group">
              <label htmlFor="dateJoined">Date Joined</label>
              <input id="dateJoined" type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <div className="input-wrapper">
                <textarea id="bio" value={bio} onChange={(e) => {setBio(e.target.value); if (errors.bio) setErrors(prev => ({ ...prev, bio: undefined }));}} placeholder="A short biography..." required aria-required="true" rows={4} aria-invalid={!!errors.bio} aria-describedby="bio-error" className={errors.bio ? 'error' : ''} ></textarea>
                {errors.bio && <div className="error-icon" aria-hidden="true">!</div>}
              </div>
              {errors.bio && <p id="bio-error" className="error-message">{errors.bio}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="affiliation-input">Affiliations (Optional)</label>
              <div className="form-group-inline">
                <input id="affiliation-input" type="text" value={currentAffiliation} onChange={(e) => setCurrentAffiliation(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAffiliation(); } }} placeholder="e.g., University, Company" />
                <button type="button" className="add-button" onClick={handleAddAffiliation} title="Add this affiliation to the list">Add</button>
              </div>
              {affiliations.length > 0 && (
                <ul className="affiliation-tags-list">
                  {affiliations.map((aff, index) => (
                    <li key={index} className="affiliation-tag">
                      {aff}
                      <button type="button" onClick={() => handleRemoveAffiliation(index)} className="remove-tag-button" aria-label={`Remove ${aff}`} title="Remove affiliation"> &times; </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="imageUrl">Profile Picture (Optional)</label>
              <div className="image-input-group">
                  <div className="input-wrapper">
                    <input id="imageUrl" type="text" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: undefined })); }} placeholder="Paste URL, upload, or take a photo" aria-invalid={!!errors.imageUrl} aria-describedby="imageUrl-error" className={errors.imageUrl ? 'error' : ''} />
                    {errors.imageUrl && <div className="error-icon" aria-hidden="true">!</div>}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} aria-hidden="true" />
                  <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()} aria-label="Upload an image file" title="Upload an image from your device">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 16h6v-6h4l-8-8-8 8h4v6zm-4 2h14v-2H5v2z"/></svg>
                  </button>
                  <button type="button" className="camera-button" onClick={openCamera} aria-label="Take a photo" title="Use your device's camera to take a photo">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9.4 11.7h5.2v-5H9.4v5Zm-2.7 5h10.6c.9 0 1.7-.8 1.7-1.7V8.4c0-.9-.8-1.7-1.7-1.7H14l-1.7-1.7H9L7.3 6.7H4c-.9 0-1.7.8-1.7 1.7v6.6c0 .9.8 1.7 1.7 1.7ZM12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0Zm5.3 16.7c0 1.8-1.5 3.3-3.3 3.3H10c-1.8 0-3.3-1.5-3.3-3.3V8.4c0-1.8 1.5-3.3 3.3-3.3h.6L12 4.4l1.4.7h.6c1.8 0 3.3 1.5 3.3 3.3v8.3Z"/></svg>
                  </button>
              </div>
              {errors.imageUrl && <p id="imageUrl-error" className="error-message">{errors.imageUrl}</p>}
              {imageUrl && !errors.imageUrl && ( <div className="image-preview-container"> <p>Preview:</p> <img src={imageUrl} alt="Profile preview" className="form-image-preview"/> </div> )}
            </div>
            <div className="form-controls">
              <button type="submit" title={editingIndex !== null ? 'Save changes to this member' : 'Add the new member to the community'}>{editingIndex !== null ? 'Update Member' : 'Add Member'}</button>
              {editingIndex !== null && ( <button type="button" onClick={resetForm} className="cancel-button" title="Discard changes and exit edit mode"> Cancel </button> )}
            </div>
          </form>
        </section>
      )}
      {currentUserRole === 'Admin' && (
        <>
          <section className="group-management-section" aria-labelledby="group-management-heading">
              <h3 id="group-management-heading">Manage Groups</h3>
              <div className="form-group-inline">
                  <label htmlFor="new-group-name" className="visually-hidden">New group name</label>
                  <input 
                      id="new-group-name"
                      type="text" 
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGroup(); }}}
                      placeholder="New group name..."
                  />
                  <button type="button" className="add-button" onClick={handleAddGroup} title="Create a new group">Add Group</button>
              </div>
              {groups.length > 0 && (
                  <ul className="group-list">
                      {groups.sort().map(g => (
                          <li key={g} className="group-list-item">
                              <span>{g}</span>
                              <button type="button" onClick={() => handleDeleteGroup(g)} className="delete-group-button" aria-label={`Delete ${g} group`} title="Delete this group">
                                  &times;
                              </button>
                          </li>
                      ))}
                  </ul>
              )}
          </section>
          <section className="data-management-section" aria-labelledby="data-management-heading">
              <h3 id="data-management-heading">Data Management</h3>
              <div className="data-controls">
                  <button type="button" onClick={() => setShowExportConfirm(true)} className="export-button" title="Export all member and group data to a single JSON file." disabled={members.length === 0 && groups.length === 0}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 13h-2v-4H9l3-4 3 4h-2v4zm3-9h-4V3l4 4z"/></svg>
                      <span>Export Data</span>
                  </button>
                  <input 
                      type="file" 
                      ref={importFileRef} 
                      onChange={handleImportChange} 
                      accept="application/json" 
                      style={{ display: 'none' }} 
                      aria-hidden="true" 
                  />
                  <button type="button" onClick={() => importFileRef.current?.click()} className="import-button" title="Import data from a JSON file. WARNING: This will overwrite all existing members and groups.">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 9v4h-2v-4H9l3-4 3 4h-2zm3-9h-4V3l4 4z"/></svg>
                      <span>Import Data</span>
                  </button>
              </div>
          </section>
        </>
      )}
      <section className="members-section" aria-labelledby="members-heading">
        <div className="section-header">
            <h2 id="members-heading">Our Community</h2>
            {members.length > 0 && ( <span className="member-count"> ({filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} found) </span> )}
        </div>
        <div className="members-controls">
            <div className="filter-group">
                <div className="search-bar" ref={searchContainerRef}>
                    <label htmlFor="search-members" className="visually-hidden">Search Members</label>
                    <input 
                      id="search-members" 
                      type="search" 
                      placeholder="Search by name, role, bio, or affiliation..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsRecentSearchesOpen(true)}
                      onBlur={() => addRecentSearch(searchTerm)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addRecentSearch(searchTerm); }}
                      aria-controls="members-grid"
                      autoComplete="off"
                    />
                    {isRecentSearchesOpen && recentSearches.length > 0 && (
                      <div className="recent-searches-dropdown">
                        <ul role="listbox">
                          {recentSearches.map((term, index) => (
                            <li 
                              key={index} 
                              role="option"
                              tabIndex={0}
                              onMouseDown={() => handleSelectRecentSearch(term)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectRecentSearch(term);}}
                            >
                              {term}
                            </li>
                          ))}
                        </ul>
                        <div className="recent-searches-actions">
                          <button type="button" onClick={handleClearRecentSearches} title="Clear all recent search terms">Clear History</button>
                        </div>
                      </div>
                    )}
                </div>
                 <div className="status-filter">
                    <label htmlFor="status-filter" className="visually-hidden">Filter by status</label>
                    <div className="select-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true"> <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/> </svg>
                        <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MemberStatus | 'All')}>
                            <option value="All">All Statuses</option> <option value="Active">Active</option> <option value="Inactive">Inactive</option> <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>
                <div className="affiliation-filter" ref={affiliationFilterRef}>
                  <button type="button" className="multiselect-toggle" onClick={() => setIsAffiliationFilterOpen(prev => !prev)} aria-haspopup="listbox" aria-expanded={isAffiliationFilterOpen} disabled={allAffiliations.length === 0} title="Filter by one or more affiliations" >
                    {selectedAffiliations.length > 0 ? `${selectedAffiliations.length} affiliation(s) selected` : "Filter by Affiliation" }
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                  {isAffiliationFilterOpen && (
                    <div className="multiselect-dropdown" role="listbox">
                      {allAffiliations.length > 0 ? (
                        <>
                          <ul> {allAffiliations.map(aff => ( <li key={aff}> <label> <input type="checkbox" checked={selectedAffiliations.includes(aff)} onChange={() => handleAffiliationChange(aff)} /> {aff} </label> </li> ))} </ul>
                          {selectedAffiliations.length > 0 && ( <div className="multiselect-actions"> <button type="button" onClick={() => setSelectedAffiliations([])} title="Clear all selected affiliation filters">Clear Selection</button> </div> )}
                        </>
                      ) : ( <p className="no-options">No affiliations to filter by.</p> )}
                    </div>
                  )}
                </div>
            </div>
            {members.length > 1 && (
                <div className="sort-controls">
                    <button type="button" onClick={() => handleSort('asc')} className={`sort-button ${sortOrder === 'asc' ? 'active' : ''}`} aria-pressed={sortOrder === 'asc'} title="Sort by name, ascending" > A-Z ↓ </button>
                    <button type="button" onClick={() => handleSort('desc')} className={`sort-button ${sortOrder === 'desc' ? 'active' : ''}`} aria-pressed={sortOrder === 'desc'} title="Sort by name, descending" > Z-A ↑ </button>
                </div>
            )}
        </div>
        {members.length === 0 ? (
          <p>No members yet. {currentUserRole === 'Admin' ? 'Add one above!' : ''}</p>
        ) : filteredMembers.length === 0 ? (
            <p>No members found matching your filters.</p>
        ) : (
          <div id="members-grid">
            {sortedGroupNames.map(groupName => (
              <details key={groupName} className="member-group" open>
                <summary>
                    <span className="group-title">{groupName}</span>
                    <span className="group-count">{groupedMembers[groupName].length} member(s)</span>
                </summary>
                <div className="members-grid">
                    {groupedMembers[groupName].map((member) => {
                        const originalIndex = members.indexOf(member);
                        const isDeleting = originalIndex === deletingIndex;
                        return (
                            <article key={originalIndex} className={`member-card ${isDeleting ? 'exiting' : ''}`} onClick={() => setSelectedMember(member)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMember(member); }}} tabIndex={0} role="button" aria-haspopup="dialog" aria-label={`View details for ${member.name}`} title={`View details for ${member.name}`} >
                                <img src={member.imageUrl || generateAvatar(member.name)} alt={`Profile of ${member.name}`} className="member-image" />
                                <div className="member-card-content">
                                    <div className="member-card-header">
                                        <h3>{member.name}</h3>
                                        <span className={`status-badge status-${member.status?.toLowerCase()}`}>{member.status}</span>
                                    </div>
                                    <p className="role">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
                                        <span>{member.role}</span>
                                    </p>
                                    {member.affiliations && member.affiliations.length > 0 && (
                                        <div className="affiliations-list card-affiliations">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true" className="affiliation-icon"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                                            <div className="affiliation-tags-wrapper">
                                                {member.affiliations.map((aff, index) => ( <span key={index} className="affiliation-tag-display">{aff}</span> ))}
                                            </div>
                                        </div>
                                    )}
                                    <p className="member-bio">{member.bio}</p>
                                    {currentUserRole === 'Admin' && (
                                      <div className="member-card-actions">
                                          <button type="button" onClick={(e) => handleEdit(e, originalIndex)} className="edit-button" title="Edit this member's details">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
                                              <span>Edit</span>
                                          </button>
                                          <button type="button" onClick={(e) => handleDelete(e, originalIndex)} className="delete-button" title="Delete this member">
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path></svg>
                                              <span>Delete</span>
                                          </button>
                                      </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
              </details>
            ))}
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
                    <button type="button" onClick={capturePhoto} title="Take the picture">Capture Photo</button>
                    <button type="button" onClick={closeCamera} className="close-button" title="Close the camera without taking a picture">Cancel</button>
                </div>
            </div>
        </div>
      )}
      {selectedMember && (
        <div className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="member-detail-title" onClick={() => setSelectedMember(null)} >
          <div className="member-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-modal-button" onClick={() => setSelectedMember(null)} aria-label="Close member details" title="Close member details"> &times; </button>
            <img src={selectedMember.imageUrl || generateAvatar(selectedMember.name)} alt={`Profile of ${selectedMember.name}`} className="member-detail-image" />
            <h3 id="member-detail-title">{selectedMember.name}</h3>
            <span className={`status-badge status-${selectedMember.status?.toLowerCase()}`}>{selectedMember.status}</span>
             {selectedMember.group && <p className="member-detail-group">Group: {selectedMember.group}</p>}
            <p className="role">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
              <span>{selectedMember.role}</span>
            </p>
            <div className="member-detail-dates">
              {selectedMember.dateJoined && <p><strong>Joined:</strong> {new Date(selectedMember.dateJoined).toLocaleDateString()}</p>}
              {selectedMember.lastActive && <p><strong>Last Active:</strong> {new Date(selectedMember.lastActive).toLocaleDateString()}</p>}
            </div>
            {selectedMember.affiliations && selectedMember.affiliations.length > 0 && (
                <div className="affiliations-list modal-affiliations">
                    <h4>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                        <span>Affiliations</span>
                    </h4>
                    <ul>
                        {selectedMember.affiliations.map((aff, index) => ( <li key={index}>{aff}</li> ))}
                    </ul>
                </div>
            )}
            <p>{selectedMember.bio}</p>

            {selectedMember.activityLog && selectedMember.activityLog.length > 0 && (
              <div className="member-detail-activity-log">
                <h4>Activity Log</h4>
                <ul>
                  {selectedMember.activityLog.map((log, index) => (
                    <li key={index}>
                      <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                      <p className="log-event">{log.event}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      {showExportConfirm && (
        <div className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="export-confirm-title" onClick={() => setShowExportConfirm(false)}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 id="export-confirm-title">Confirm Export</h3>
                <p>Are you sure you want to export all member and group data to a JSON file?</p>
                <div className="confirm-modal-actions">
                    <button type="button" className="cancel-button" onClick={() => setShowExportConfirm(false)} title="Cancel the export process">Cancel</button>
                    <button type="button" className="confirm-button-export" onClick={executeExport} title="Confirm and download the data file">Yes, Export Data</button>
                </div>
            </div>
        </div>
      )}
      {showImportConfirm && (
        <div className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="import-confirm-title" onClick={() => {setShowImportConfirm(false); setImportFileData(null);}}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 id="import-confirm-title">Confirm Import</h3>
                <p>
                    <strong>Warning:</strong> Are you sure you want to import data from this file? 
                    This action will <strong>completely overwrite</strong> all current members and groups. This cannot be undone.
                </p>
                <div className="confirm-modal-actions">
                    <button type="button" className="cancel-button" onClick={() => {setShowImportConfirm(false); setImportFileData(null);}} title="Cancel the import process">Cancel</button>
                    <button type="button" className="confirm-button-import" onClick={executeImport} title="Confirm and import the data, overwriting existing records">Yes, Overwrite and Import</button>
                </div>
            </div>
        </div>
      )}
      {isDashboardOpen && (
        <div className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-title" onClick={() => setIsDashboardOpen(false)}>
          <div className="dashboard-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-modal-button" onClick={() => setIsDashboardOpen(false)} aria-label="Close dashboard" title="Close dashboard"> &times; </button>
            <h2 id="dashboard-title">Community Dashboard</h2>
            {dashboardStats ? (
              <div className="dashboard-grid">
                <div className="dashboard-widget">
                  <h3>Total Members</h3>
                  <p className="dashboard-stat-large">{dashboardStats.totalMembers}</p>
                </div>
                <div className="dashboard-widget">
                  <h3>Status Breakdown</h3>
                  <div className="status-distribution-bar" aria-label="Status distribution bar">
                    <div 
                        className="status-segment status-active" 
                        style={{width: `${(dashboardStats.statusCounts.Active / dashboardStats.totalMembers) * 100}%`}} 
                        title={`Active: ${dashboardStats.statusCounts.Active}`}
                    />
                    <div 
                        className="status-segment status-pending" 
                        style={{width: `${(dashboardStats.statusCounts.Pending / dashboardStats.totalMembers) * 100}%`}}
                        title={`Pending: ${dashboardStats.statusCounts.Pending}`}
                    />
                    <div 
                        className="status-segment status-inactive" 
                        style={{width: `${(dashboardStats.statusCounts.Inactive / dashboardStats.totalMembers) * 100}%`}}
                        title={`Inactive: ${dashboardStats.statusCounts.Inactive}`}
                    />
                  </div>
                  <ul className="dashboard-list">
                    <li><span className="status-dot status-active"></span>Active: <strong>{dashboardStats.statusCounts.Active}</strong></li>
                    <li><span className="status-dot status-pending"></span>Pending: <strong>{dashboardStats.statusCounts.Pending}</strong></li>
                    <li><span className="status-dot status-inactive"></span>Inactive: <strong>{dashboardStats.statusCounts.Inactive}</strong></li>
                  </ul>
                </div>
                <div className="dashboard-widget full-width">
                  <h3>Group Breakdown</h3>
                  {Object.keys(dashboardStats.groupCounts).length > 0 && dashboardStats.maxGroupCount > 0 ? (
                    <ul className="group-breakdown-chart">
                      {Object.entries(dashboardStats.groupCounts)
                        .sort(([a], [b]) => {
                           if (a === 'Unassigned') return 1;
                           if (b === 'Unassigned') return -1;
                           return a.localeCompare(b);
                        })
                        .map(([groupName, count]) => (
                          <li key={groupName} className="group-bar-item">
                            <span className="group-bar-label" title={groupName}>{groupName}</span>
                            <div className="group-bar-wrapper">
                                <div 
                                    className="group-bar" 
                                    style={{width: `${(count / dashboardStats.maxGroupCount) * 100}%`}}
                                />
                            </div>
                            <span className="group-bar-count">{count}</span>
                          </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No groups or members in groups yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p>No members yet. Add a member to see dashboard stats.</p>
            )}
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