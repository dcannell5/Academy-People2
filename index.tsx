/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

type MemberStatus = 'Active' | 'Inactive' | 'Pending';
type UserRole = 'SuperAdmin' | 'AssistAdmin' | 'MediaAdmin' | 'MerchAdmin' | 'FinanceAdmin' | 'Member';
type MemberType = 'N/A' | 'Player' | 'Parent/Guardian' | 'Coach' | 'Community Member';
type CommunicationType = 'Newsletter' | 'Memo' | 'Email' | 'Phone Call';

const ALL_ROLES: UserRole[] = ['SuperAdmin', 'AssistAdmin', 'MediaAdmin', 'MerchAdmin', 'FinanceAdmin', 'Member'];
const ALL_MEMBER_TYPES: MemberType[] = ['N/A', 'Player', 'Parent/Guardian', 'Coach', 'Community Member'];
const ALL_COMMUNICATION_TYPES: CommunicationType[] = ['Email', 'Phone Call', 'Newsletter', 'Memo'];


const ACADEMY_LEVELS = {
  'N/A': { title: 'Not Applicable', description: 'No academy level assigned.' },
  'Rising Star': { title: 'Rising Stars (Grades 3–6, Beginners)', description: 'For younger athletes new to volleyball. Focus: Learning movement patterns and basic coordination to prepare for the next level.' },
  'NexGen': { title: 'NexGen (Grades 6-8, Beginners)', description: 'Who is it for? Athletes in Grades 6-8 who have attended fewer than five academy sessions and are new to volleyball. Focus: Introducing the fundamentals of volleyball, such as basic skills and game understanding.' },
  'Basic': { title: 'Basic (Grades 6–10, Beginners with Some Experience)', description: 'For athletes who have at least one year of organized volleyball, OR have completed 5+ NexGen sessions, OR have attended one four-day Academy camp. Focus: Developing skills with more repetition and applying them to game-like situations.' },
  'Intermediate': { title: 'Intermediate Level', description: 'Target Audience: Players typically grades 9-10 with "a bit more under their belt," often "club experience," or having "attended basic sessions before as a prerequisite or recommendation." Assumed Fundamentals: This level "assumes you\'ve got a pretty solid handle on those fundamentals already." The focus "shifts...into like intermediate skill refinement gameplay strategy."' },
  'Advanced': { title: 'Advanced (Grades 10-12, Competitive Players)', description: 'Who is it for? Athletes in Grades 10-12 with: 2+ years of high school and/or club volleyball experience, Completion of 10+ academy sessions at lower tiers. Athletes with less than two years of playing experience are not advised to register for this session. Focus: Advanced skills, high-level competition, and preparation for elite performance.' }
};

type AcademyLevel = keyof typeof ACADEMY_LEVELS;

interface RolePermission {
    parent?: UserRole;
    description: string;
    canViewAll?: boolean;
    canAddMembers?: boolean;
    canEditMembers?: boolean;
    canDeleteMembers?: boolean;
    canManageGroups?: boolean;
    canImportExport?: boolean;
    canChangeRoles?: boolean;
    canViewDashboard?: boolean;
    editableFields?: string[] | 'all';
}

// Centralized permission management with hierarchy
const PERMISSIONS: Record<UserRole, RolePermission> = {
    SuperAdmin: {
        description: 'Full access to all features, including data management and role changes.',
        canViewAll: true,
        canAddMembers: true,
        canEditMembers: true,
        canDeleteMembers: true,
        canManageGroups: true,
        canImportExport: true,
        canChangeRoles: true,
        canViewDashboard: true,
        editableFields: ['all']
    },
    AssistAdmin: {
        parent: 'SuperAdmin',
        description: 'Can add, edit, and delete members and manage groups.',
        canImportExport: false, // Override parent
        canChangeRoles: false, // Override parent
    },
    MediaAdmin: {
        parent: 'AssistAdmin',
        description: 'Can only edit member profile pictures and bios.',
        canAddMembers: false,
        canDeleteMembers: false,
        canManageGroups: false,
        editableFields: ['imageUrl', 'bio', 'photoLinks'], // Specific override
    },
    MerchAdmin: {
        parent: 'AssistAdmin',
        description: 'Can only edit member affiliations.',
        canAddMembers: false,
        canDeleteMembers: false,
        canManageGroups: false,
        editableFields: ['affiliations'], // Specific override
    },
    FinanceAdmin: {
        parent: 'AssistAdmin',
        description: 'Read-only access to all member details.',
        canAddMembers: false,
        canEditMembers: false, // Override parent
        canDeleteMembers: false,
        canManageGroups: false,
        editableFields: [], // Specific override
    },
    Member: {
        description: 'Read-only access to the community list.',
        canViewAll: true,
        canAddMembers: false,
        canEditMembers: false,
        canDeleteMembers: false,
        canManageGroups: false,
        canImportExport: false,
        canChangeRoles: false,
        canViewDashboard: false,
        editableFields: [],
    }
};

// Helper function for recursive permission check
const getPermissionValue = (
    role: UserRole, 
    permission: keyof Omit<RolePermission, 'parent' | 'description' | 'editableFields'>
): boolean => {
    let currentRole: UserRole | undefined = role;
    while (currentRole) {
        const rolePermissions = PERMISSIONS[currentRole];
        if (rolePermissions[permission] !== undefined) {
            return rolePermissions[permission] as boolean;
        }
        currentRole = rolePermissions.parent;
    }
    return false; // Default to false if not found anywhere in the hierarchy
};


interface Group {
  id: string;
  name: string;
  subgroups: string[];
}

interface SessionCancellation {
    id: string;
    sessionName: string;
    cancellationDate: string;
    reason: string;
    refundIssued: boolean;
    fitsRefundPolicy: boolean;
}

interface CommunicationLog {
    id: string;
    type: CommunicationType;
    date: string;
    subject: string;
    notes: string;
}

interface CoachComment {
    id: string;
    date: string;
    comment: string;
}

interface PhotoLink {
    id: string;
    url: string;
    description: string;
}

interface Member {
  id: string; // Now mandatory
  name: string;
  role: string;
  memberType?: MemberType;
  bio: string;
  imageUrl?: string;
  status: MemberStatus;
  affiliations: string[];
  groupId?: string;
  subgroup?: string;
  createdAt?: string;
  dateJoined?: string;
  lastActive?: string;
  activityLog?: { timestamp: string; event: string; }[];
  phone?: string;
  email?: string;
  address?: string;
  birthdate?: string;
  gender?: string;
  relationship?: {
    relatedMemberId: string;
    relationshipType: string;
  };
  elementarySchool?: string;
  highSchool?: string;
  schoolVolleyballLevel?: string;
  clubVolleyball?: string;
  academyLevel?: AcademyLevel;
  playerVolleyballAchievements?: string[];
  academyAchievements?: string[];
  postAcademyAchievements?: string[];
  academySessionsAttended?: string[];
  totalAcademySessions?: number;
  academyHours?: number;
  academyCoaches?: string;
  sessionsFeedback?: string;
  coachFeedback?: string;
  sessionCancellations?: SessionCancellation[];
  communications?: CommunicationLog[];
  coachCommentsLog?: CoachComment[];
  photoLinks?: PhotoLink[];
}

interface FormErrors {
    name?: string;
    role?: string;
    bio?: string;
    imageUrl?: string;
    email?: string;
    birthdate?: string;
    photoLinkUrl?: string;
}

interface ImportData {
    members: Member[];
    groups: Group[];
}

interface CsvImportData {
    newMembers: Member[];
    updatedMembers: { member: Member, original: Member }[];
    errors: { row: number; message: string; }[];
}

interface SortConfig {
  key: 'name' | 'role' | 'status' | 'dateJoined' | 'memberType';
  direction: 'asc' | 'desc';
}

interface FormDraft {
    data: any;
    editingId: string | null;
}

// --- DATA ABSTRACTION LAYER (API CLIENT) ---
// This object simulates an API client by using localStorage, but maintains an async, promise-based
// interface, making it easy to swap out for a real backend later.

const MOCK_API_LATENCY = 150; // ms

const apiClient = {
    _getData() {
        try {
            const data = localStorage.getItem('community-app-data-v2');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.members && parsed.groups) return parsed;
            }
        } catch (e) {
            console.error("Failed to parse data from localStorage", e);
        }
        return { members: [], groups: [], userRole: 'SuperAdmin', recentSearches: [], formDraft: null };
    },
    _saveData(data: any) {
        localStorage.setItem('community-app-data-v2', JSON.stringify(data));
    },

    async getInitialData(): Promise<{ members: Member[], groups: Group[], userRole: UserRole, recentSearches: string[] }> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                resolve({
                    members: data.members,
                    groups: data.groups,
                    userRole: data.userRole,
                    recentSearches: data.recentSearches,
                });
            }, MOCK_API_LATENCY);
        });
    },

    async createMember(memberData: Omit<Member, 'id'>): Promise<Member> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                const newMember: Member = {
                    ...memberData,
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    lastActive: new Date().toISOString(),
                    activityLog: [{ timestamp: new Date().toISOString(), event: "Member record created." }],
                } as Member;
                data.members.push(newMember);
                this._saveData(data);
                resolve(newMember);
            }, MOCK_API_LATENCY);
        });
    },

    async updateMember(memberId: string, memberData: Member): Promise<Member> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const data = this._getData();
                const index = data.members.findIndex((m: Member) => m.id === memberId);
                if (index === -1) {
                    return reject(new Error("Member not found"));
                }
                const updatedMember = {
                    ...memberData,
                    lastActive: new Date().toISOString(),
                    activityLog: [
                        { timestamp: new Date().toISOString(), event: "Member details updated." },
                        ...(memberData.activityLog || [])
                    ]
                };
                data.members[index] = updatedMember;
                this._saveData(data);
                resolve(updatedMember);
            }, MOCK_API_LATENCY);
        });
    },

    async deleteMember(memberId: string): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.members = data.members.filter((m: Member) => m.id !== memberId);
                data.members.forEach((m: Member) => {
                    if (m.relationship?.relatedMemberId === memberId) {
                        m.relationship = undefined;
                    }
                });
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },

    async createGroup(groupData: Omit<Group, 'id'>): Promise<Group> {
         return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                const newGroup: Group = { ...groupData, id: crypto.randomUUID() };
                data.groups.push(newGroup);
                this._saveData(data);
                resolve(newGroup);
            }, MOCK_API_LATENCY);
        });
    },
    async updateGroup(groupId: string, groupData: Group): Promise<Group> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const data = this._getData();
                const index = data.groups.findIndex((g: Group) => g.id === groupId);
                if (index === -1) return reject(new Error("Group not found"));
                data.groups[index] = groupData;
                this._saveData(data);
                resolve(groupData);
            }, MOCK_API_LATENCY);
        });
    },
    async deleteGroup(groupId: string): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.groups = data.groups.filter((g: Group) => g.id !== groupId);
                data.members.forEach((m: Member) => {
                    if (m.groupId === groupId) {
                        m.groupId = undefined;
                        m.subgroup = undefined;
                    }
                });
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },

    async saveUserRole(role: UserRole): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.userRole = role;
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },
    async saveRecentSearches(searches: string[]): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.recentSearches = searches;
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },

    async getFormDraft(): Promise<FormDraft | null> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                resolve(data.formDraft || null);
            }, MOCK_API_LATENCY);
        });
    },
    async saveFormDraft(draft: FormDraft): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.formDraft = draft;
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },
    async clearFormDraft(): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                data.formDraft = null;
                this._saveData(data);
                resolve();
            }, MOCK_API_LATENCY);
        });
    },
    
    async bulkImport(importData: CsvImportData): Promise<Member[]> {
        return new Promise(resolve => {
            setTimeout(() => {
                const data = this._getData();
                const memberMap = new Map(data.members.map((m: Member) => [m.email?.toLowerCase(), m.id]));

                importData.updatedMembers.forEach(update => {
                    const existingId = memberMap.get(update.original.email?.toLowerCase());
                    if (existingId) {
                        const index = data.members.findIndex((m: Member) => m.id === existingId);
                        const originalMember = data.members[index];

                        const communicationLog = [
                            { id: crypto.randomUUID(), type: 'Memo' as CommunicationType, date: new Date().toISOString(), subject: 'System Import', notes: 'Member record updated via CSV import.' },
                            ...(originalMember.communications || [])
                        ];
                        const activityLog = [
                            { timestamp: new Date().toISOString(), event: "Member record updated via CSV import." },
                            ...(originalMember.activityLog || [])
                        ];
                        data.members[index] = { ...update.member, communications: communicationLog, activityLog: activityLog };
                    }
                });

                data.members.push(...importData.newMembers);
                this._saveData(data);
                resolve(data.members);
            }, MOCK_API_LATENCY);
        });
    },
    async clearAllData(): Promise<void> {
         return new Promise(resolve => {
            setTimeout(() => {
                this._saveData({ members: [], groups: [], userRole: 'SuperAdmin', recentSearches: [], formDraft: null });
                resolve();
            }, MOCK_API_LATENCY);
        });
    }
};

const generateAvatar = (name: string, id: string): string => {
    if (!name || !id) return ''; // Needs a seed (id or name) and a name for the initial

    const initial = name.charAt(0).toUpperCase();

    // Simple hashing function to get a stable number from a string
    const getHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    const hash = getHash(id);

    // Generate two distinct, vibrant colors from the hash
    const hue1 = hash % 360;
    const hue2 = (hue1 + 120) % 360; // Use a triadic color for good contrast
    const saturation = 70;
    const lightness = 50;

    const color1 = `hsl(${hue1}, ${saturation}%, ${lightness}%)`;
    const color2 = `hsl(${hue2}, ${saturation}%, ${lightness}%)`;

    // Determine gradient angle from the hash
    const angles = [0, 45, 90, 135];
    const angle = angles[hash % angles.length];

    // Since lightness is fixed at 50%, a white text will always have good contrast.
    const textColor = '#FFFFFF';

    const svg = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} 0.5 0.5)">
            <stop offset="0%" style="stop-color:${color1};" />
            <stop offset="100%" style="stop-color:${color2};" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text
          x="50%"
          y="50%"
          dominant-baseline="central"
          text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          font-size="100"
          font-weight="bold"
          fill="${textColor}"
          paint-order="stroke"
          stroke="rgba(0,0,0,0.3)"
          stroke-width="3px"
          stroke-linecap="butt"
          stroke-linejoin="miter"
        >
          ${initial}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
};

const getTodayString = () => new Date().toISOString().split('T')[0];

const calculateAge = (birthdateString?: string): number | null => {
    if (!birthdateString) return null;
    try {
        const birthDate = new Date(birthdateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    } catch (e) {
        return null;
    }
};

const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote ("")
                if (i + 1 < line.length && line[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    result.push(currentField);
    return result.map(field => field.trim());
};


interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder: string;
    error: boolean;
    disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, error, disabled = false }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (!disabled) {
            onChange(e.currentTarget.innerHTML);
        }
    };

    const applyFormat = (command: string, value: string | null = null) => {
        if (!disabled) {
            document.execCommand(command, false, value);
            editorRef.current?.focus();
        }
    };

    const handleLink = () => {
        if (!disabled) {
            const url = prompt('Enter the URL:', 'https://');
            if (url) {
                applyFormat('createLink', url);
            }
        }
    };

    return (
        <div className={`rich-text-editor ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}>
            <div className="rte-toolbar" role="toolbar">
                <button type="button" onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)" aria-label="Bold" disabled={disabled}><b>B</b></button>
                <button type="button" onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)" aria-label="Italic" disabled={disabled}><i>I</i></button>
                <button type="button" onClick={() => applyFormat('underline')} title="Underline (Ctrl+U)" aria-label="Underline" disabled={disabled}><u>U</u></button>
                <button type="button" onClick={handleLink} title="Create Link" aria-label="Create Link" disabled={disabled}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1-3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                </button>
            </div>
            <div
                ref={editorRef}
                className="rte-content"
                contentEditable={!disabled}
                onInput={handleInput}
                data-placeholder={placeholder}
                aria-label="Member bio"
                role="textbox"
                aria-multiline="true"
                dangerouslySetInnerHTML={{ __html: value }}
            ></div>
        </div>
    );
};


const App = () => {
  const [members, setMembers] = useState<Member[]>([]);
  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [memberType, setMemberType] = useState<MemberType>('N/A');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<MemberStatus>('Active');
  const [affiliations, setAffiliations] = useState<string[]>([]);
  const [currentAffiliation, setCurrentAffiliation] = useState('');
  const [groupId, setGroupId] = useState('');
  const [subgroup, setSubgroup] = useState('');
  const [dateJoined, setDateJoined] = useState(getTodayString());
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState({ relatedMemberId: '', relationshipType: ''});
  const [elementarySchool, setElementarySchool] = useState('');
  const [highSchool, setHighSchool] = useState('');
  const [schoolVolleyballLevel, setSchoolVolleyballLevel] = useState('');
  const [clubVolleyball, setClubVolleyball] = useState('');

  // Academy & Achievements State
  const [academyLevel, setAcademyLevel] = useState<AcademyLevel>('N/A');
  const [playerVolleyballAchievements, setPlayerVolleyballAchievements] = useState<string[]>([]);
  const [currentPVAchievement, setCurrentPVAchievement] = useState('');
  const [academyAchievements, setAcademyAchievements] = useState<string[]>([]);
  const [currentAAchievement, setCurrentAAchievement] = useState('');
  const [postAcademyAchievements, setPostAcademyAchievements] = useState<string[]>([]);
  const [currentPostAAchievement, setCurrentPostAAchievement] = useState('');
  const [academySessionsAttended, setAcademySessionsAttended] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState('');
  const [totalAcademySessions, setTotalAcademySessions] = useState('');
  const [academyHours, setAcademyHours] = useState('');
  const [academyCoaches, setAcademyCoaches] = useState('');
  const [sessionsFeedback, setSessionsFeedback] = useState('');
  const [coachFeedback, setCoachFeedback] = useState('');
  
  // Session Cancellation State
  const [sessionCancellations, setSessionCancellations] = useState<SessionCancellation[]>([]);
  const [newCancellation, setNewCancellation] = useState({
    sessionName: '',
    cancellationDate: getTodayString(),
    reason: '',
    refundIssued: 'No',
    fitsRefundPolicy: 'No',
  });
  const [isRefundPolicyOpen, setIsRefundPolicyOpen] = useState(false);

  // Communications & Logs State
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [newCommunication, setNewCommunication] = useState({ type: 'Email' as CommunicationType, subject: '', notes: '' });
  const [coachCommentsLog, setCoachCommentsLog] = useState<CoachComment[]>([]);
  const [newCoachComment, setNewCoachComment] = useState('');
  const [photoLinks, setPhotoLinks] = useState<PhotoLink[]>([]);
  const [newPhotoLink, setNewPhotoLink] = useState({ url: '', description: '' });

  // Draft Management State
  const [draftData, setDraftData] = useState<FormDraft | null>(null);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isRecentSearchesOpen, setIsRecentSearchesOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'All'>('All');
  const [memberTypeFilter, setMemberTypeFilter] = useState<MemberType | 'All'>('All');
  const [selectedAffiliations, setSelectedAffiliations] = useState<string[]>([]);
  const [isAffiliationFilterOpen, setIsAffiliationFilterOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFileData, setImportFileData] = useState<ImportData | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);
  const [showCsvImportConfirm, setShowCsvImportConfirm] = useState(false);
  const [csvImportData, setCsvImportData] = useState<CsvImportData | null>(null);


  // Group Management State
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newSubgroupName, setNewSubgroupName] = useState('');
  const [editingGroupIdForSubgroup, setEditingGroupIdForSubgroup] = useState('');
  const [editingGroupNameId, setEditingGroupNameId] = useState<string | null>(null);
  const [editingGroupNewName, setEditingGroupNewName] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState<{ groupId: string; originalName: string } | null>(null);
  const [editingSubgroupNewName, setEditingSubgroupNewName] = useState('');


  // Role Management State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('SuperAdmin');


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const affiliationFilterRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

    // Permission helpers
    const hasPermission = (permission: keyof Omit<RolePermission, 'parent' | 'description' | 'editableFields'>) => {
        return getPermissionValue(currentUserRole, permission);
    };

    const canEditField = (fieldName: string) => {
        if (!hasPermission('canEditMembers')) return false;

        let currentRole: UserRole | undefined = currentUserRole;
        while(currentRole) {
            const permissions = PERMISSIONS[currentRole];
            const editable = permissions.editableFields;
            if (editable) {
                return editable.includes('all') || editable.includes(fieldName);
            }
            currentRole = permissions.parent;
        }
        return false;
    };
    
    // Memoize the current form state for auto-saving
    const formState = useMemo(() => ({
        name, role, memberType, bio, imageUrl, status, affiliations, groupId, subgroup,
        dateJoined, phone, email, address, birthdate, gender, relationship,
        elementarySchool, highSchool, schoolVolleyballLevel, clubVolleyball,
        academyLevel, playerVolleyballAchievements, academyAchievements, postAcademyAchievements,
        academySessionsAttended, totalAcademySessions, academyHours,
        academyCoaches, sessionsFeedback, coachFeedback, sessionCancellations,
        communications, coachCommentsLog, photoLinks
    }), [
        name, role, memberType, bio, imageUrl, status, affiliations, groupId, subgroup,
        dateJoined, phone, email, address, birthdate, gender, relationship,
        elementarySchool, highSchool, schoolVolleyballLevel, clubVolleyball,
        academyLevel, playerVolleyballAchievements, academyAchievements, postAcademyAchievements,
        academySessionsAttended, totalAcademySessions, academyHours,
        academyCoaches, sessionsFeedback, coachFeedback, sessionCancellations,
        communications, coachCommentsLog, photoLinks
    ]);

    // Load initial data and draft from API client
    useEffect(() => {
      const loadData = async () => {
        setIsLoading(true);
        try {
            const initialData = await apiClient.getInitialData();
            setMembers(initialData.members);
            setGroups(initialData.groups);
            setCurrentUserRole(initialData.userRole);
            setRecentSearches(initialData.recentSearches);
            
            const draft = await apiClient.getFormDraft();
            if (draft) setDraftData(draft);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            alert(`Could not load data from the server: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
      };
      loadData();
    }, []);

    // Auto-save form draft on change (debounced)
    useEffect(() => {
        // Only save if the user can actually edit the form
        if (!hasPermission('canEditMembers') && !hasPermission('canAddMembers')) return;

        const handler = setTimeout(async () => {
            const isPristine = !formState.name && !formState.role && !formState.bio && formState.affiliations.length === 0 && !formState.email;
            if (!isPristine) {
                const draft: FormDraft = { data: formState, editingId: editingMemberId };
                try {
                    await apiClient.saveFormDraft(draft);
                } catch (error) {
                    console.error("Failed to save draft:", error);
                }
            }
        }, 1000); // 1-second debounce

        return () => {
            clearTimeout(handler);
        };
    }, [formState, editingMemberId, hasPermission]);


  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
        videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCsvImportConfirm) {
            setShowCsvImportConfirm(false);
            setCsvImportData(null);
        }
        else if (isRefundPolicyOpen) setIsRefundPolicyOpen(false);
        else if (isDashboardOpen) setIsDashboardOpen(false);
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
  }, [isCameraOpen, selectedMember, isAffiliationFilterOpen, isRecentSearchesOpen, showExportConfirm, showImportConfirm, isDashboardOpen, isRefundPolicyOpen, showCsvImportConfirm]);

  const groupMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  
  const clearDraft = async () => {
      try {
        await apiClient.clearFormDraft();
        setDraftData(null);
      } catch (error) {
        console.error("Failed to clear draft:", error);
      }
  };
  
  const restoreDraft = () => {
      if (!draftData) return;
      const data = draftData.data;
      setName(data.name || '');
      setRole(data.role || '');
      setMemberType(data.memberType || 'N/A');
      setBio(data.bio || '');
      setImageUrl(data.imageUrl || '');
      setStatus(data.status || 'Active');
      setAffiliations(data.affiliations || []);
      setGroupId(data.groupId || '');
      setSubgroup(data.subgroup || '');
      setDateJoined(data.dateJoined || getTodayString());
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setAddress(data.address || '');
      setBirthdate(data.birthdate || '');
      setGender(data.gender || '');
      setRelationship(data.relationship || { relatedMemberId: '', relationshipType: '' });
      setElementarySchool(data.elementarySchool || '');
      setHighSchool(data.highSchool || '');
      setSchoolVolleyballLevel(data.schoolVolleyballLevel || '');
      setClubVolleyball(data.clubVolleyball || '');
      setAcademyLevel(data.academyLevel || 'N/A');
      setPlayerVolleyballAchievements(data.playerVolleyballAchievements || []);
      setAcademyAchievements(data.academyAchievements || []);
      setPostAcademyAchievements(data.postAcademyAchievements || []);
      setAcademySessionsAttended(data.academySessionsAttended || []);
      setTotalAcademySessions(data.totalAcademySessions || '');
      setAcademyHours(data.academyHours || '');
      setAcademyCoaches(data.academyCoaches || '');
      setSessionsFeedback(data.sessionsFeedback || '');
      setCoachFeedback(data.coachFeedback || '');
      setSessionCancellations(data.sessionCancellations || []);
      setCommunications(data.communications || []);
      setCoachCommentsLog(data.coachCommentsLog || []);
      setPhotoLinks(data.photoLinks || []);
      setDraftData(null); // Hide the prompt after restoring
  };


  const resetForm = () => {
    setName('');
    setRole('');
    setMemberType('N/A');
    setBio('');
    setImageUrl('');
    setStatus('Active');
    setAffiliations([]);
    setCurrentAffiliation('');
    setGroupId('');
    setSubgroup('');
    setDateJoined(getTodayString());
    setPhone('');
    setEmail('');
    setAddress('');
    setBirthdate('');
    setGender('');
    setRelationship({ relatedMemberId: '', relationshipType: '' });
    setElementarySchool('');
    setHighSchool('');
    setSchoolVolleyballLevel('');
    setClubVolleyball('');
    setAcademyLevel('N/A');
    setPlayerVolleyballAchievements([]);
    setCurrentPVAchievement('');
    setAcademyAchievements([]);
    setCurrentAAchievement('');
    setPostAcademyAchievements([]);
    setCurrentPostAAchievement('');
    setAcademySessionsAttended([]);
    setCurrentSession('');
    setTotalAcademySessions('');
    setAcademyHours('');
    setAcademyCoaches('');
    setSessionsFeedback('');
    setCoachFeedback('');
    setSessionCancellations([]);
    setNewCancellation({ sessionName: '', cancellationDate: getTodayString(), reason: '', refundIssued: 'No', fitsRefundPolicy: 'No' });
    setCommunications([]);
    setNewCommunication({ type: 'Email', subject: '', notes: '' });
    setCoachCommentsLog([]);
    setNewCoachComment('');
    setPhotoLinks([]);
    setNewPhotoLink({ url: '', description: '' });
    setEditingMemberId(null);
    setErrors({});
    clearDraft();
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (canEditField('name') && !name.trim()) newErrors.name = 'Full Name is required.';
    if (canEditField('role') && !role.trim()) newErrors.role = 'Role is required.';

    const bioText = bio.replace(/<[^>]*>?/gm, '').trim();
    if (canEditField('bio') && !bioText) newErrors.bio = 'Bio is required.';

    if (canEditField('email') && email && !/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Please enter a valid email address.';
    }

    if (canEditField('birthdate') && birthdate && new Date(birthdate) > new Date()) {
        newErrors.birthdate = 'Birthdate cannot be in the future.';
    }

    if (canEditField('imageUrl') && imageUrl) {
        const urlRegex = /^(https?:\/\/|data:image\/).+/;
        if (!urlRegex.test(imageUrl)) {
            newErrors.imageUrl = 'Please enter a valid URL (starting with http://, https://, or data:image/).';
        }
    }
    
    if (newPhotoLink.url && !/^(https?:\/\/).+/.test(newPhotoLink.url)) {
        newErrors.photoLinkUrl = 'Please enter a valid URL for the photo link.';
    }

    return newErrors;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingMemberId) {
        if (!hasPermission('canEditMembers')) return;
    } else {
        if (!hasPermission('canAddMembers')) return;
    }

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
    }
    
    setIsSubmitting(true);

    const finalDateJoined = dateJoined ? new Date(dateJoined).toISOString() : new Date().toISOString();
    
    const finalRelationship = relationship.relatedMemberId && relationship.relationshipType
      ? relationship
      : undefined;

    const baseMemberData = {
        name, role, memberType, bio, imageUrl, status, affiliations, groupId, subgroup,
        dateJoined: finalDateJoined,
        phone, email, address, birthdate, gender, relationship: finalRelationship,
        elementarySchool, highSchool, schoolVolleyballLevel, clubVolleyball, academyLevel,
        playerVolleyballAchievements, academyAchievements, postAcademyAchievements,
        academySessionsAttended,
        totalAcademySessions: totalAcademySessions ? Number(totalAcademySessions) : undefined,
        academyHours: academyHours ? Number(academyHours) : undefined,
        academyCoaches, sessionsFeedback, coachFeedback, sessionCancellations,
        communications, coachCommentsLog, photoLinks,
    };

    try {
        if (editingMemberId) {
            const originalMember = memberMap.get(editingMemberId);
            if (!originalMember) throw new Error("Member to edit not found");

            const updatedMemberPayload = {
                ...originalMember,
                ...baseMemberData
            };
            
            const updatedMemberFromApi = await apiClient.updateMember(editingMemberId, updatedMemberPayload);
            setMembers(members.map((m) => m.id === editingMemberId ? updatedMemberFromApi : m));
        } else {
            const newMemberFromApi = await apiClient.createMember(baseMemberData as Omit<Member, 'id'>);
            setMembers([...members, newMemberFromApi]);
        }
        resetForm();
    } catch (error) {
        console.error("Failed to save member:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not save member.'}`);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleEdit = (e: React.MouseEvent, memberToEdit: Member) => {
    e.stopPropagation();
    if (!hasPermission('canEditMembers')) return;
    
    setName(memberToEdit.name);
    setRole(memberToEdit.role);
    setMemberType(memberToEdit.memberType || 'N/A');
    setBio(memberToEdit.bio);
    setImageUrl(memberToEdit.imageUrl || '');
    setStatus(memberToEdit.status || 'Active');
    setAffiliations(memberToEdit.affiliations || []);
    setGroupId(memberToEdit.groupId || '');
    setSubgroup(memberToEdit.subgroup || '');
    setDateJoined(memberToEdit.dateJoined ? memberToEdit.dateJoined.split('T')[0] : '');
    setPhone(memberToEdit.phone || '');
    setEmail(memberToEdit.email || '');
    setAddress(memberToEdit.address || '');
    setBirthdate(memberToEdit.birthdate ? memberToEdit.birthdate.split('T')[0] : '');
    setGender(memberToEdit.gender || '');
    setRelationship(memberToEdit.relationship || { relatedMemberId: '', relationshipType: '' });
    setElementarySchool(memberToEdit.elementarySchool || '');
    setHighSchool(memberToEdit.highSchool || '');
    setSchoolVolleyballLevel(memberToEdit.schoolVolleyballLevel || '');
    setClubVolleyball(memberToEdit.clubVolleyball || '');
    setAcademyLevel(memberToEdit.academyLevel || 'N/A');
    setPlayerVolleyballAchievements(memberToEdit.playerVolleyballAchievements || []);
    setAcademyAchievements(memberToEdit.academyAchievements || []);
    setPostAcademyAchievements(memberToEdit.postAcademyAchievements || []);
    setAcademySessionsAttended(memberToEdit.academySessionsAttended || []);
    setTotalAcademySessions(memberToEdit.totalAcademySessions?.toString() || '');
    setAcademyHours(memberToEdit.academyHours?.toString() || '');
    setAcademyCoaches(memberToEdit.academyCoaches || '');
    setSessionsFeedback(memberToEdit.sessionsFeedback || '');
    setCoachFeedback(memberToEdit.coachFeedback || '');
    setSessionCancellations(memberToEdit.sessionCancellations || []);
    setCommunications(memberToEdit.communications || []);
    setCoachCommentsLog(memberToEdit.coachCommentsLog || []);
    setPhotoLinks(memberToEdit.photoLinks || []);
    setEditingMemberId(memberToEdit.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (e: React.MouseEvent, memberToDelete: Member) => {
    e.stopPropagation();
    if (!hasPermission('canDeleteMembers')) return;
    if (window.confirm(`Are you sure you want to delete ${memberToDelete.name}?`)) {
        setDeletingMemberId(memberToDelete.id);
        
        try {
            await apiClient.deleteMember(memberToDelete.id);
             setTimeout(() => {
                setMembers(prev => prev.filter(m => m.id !== memberToDelete.id));
                if (editingMemberId === memberToDelete.id) resetForm();
                setDeletingMemberId(null);
            }, 400); // Keep animation
        } catch (error) {
            console.error("Failed to delete member:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'Could not delete member.'}`);
            setDeletingMemberId(null);
        }
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

  const handleAddAffiliation = () => {
    if (currentAffiliation.trim() && !affiliations.includes(currentAffiliation.trim())) {
      setAffiliations([...affiliations, currentAffiliation.trim()]);
      setCurrentAffiliation('');
    }
  };

  const handleRemoveAffiliation = (indexToRemove: number) => {
    setAffiliations(affiliations.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAddCancellation = () => {
      if (!newCancellation.sessionName.trim() || !newCancellation.reason.trim()) {
          alert("Please provide both a session name and a reason for cancellation.");
          return;
      }
      
      const newRecord: SessionCancellation = {
          id: crypto.randomUUID(),
          sessionName: newCancellation.sessionName.trim(),
          cancellationDate: new Date(newCancellation.cancellationDate).toISOString(),
          reason: newCancellation.reason.trim(),
          refundIssued: newCancellation.refundIssued === 'Yes',
          fitsRefundPolicy: newCancellation.fitsRefundPolicy === 'Yes',
      };
      
      setSessionCancellations(prev => [...prev, newRecord]);
      setNewCancellation({ sessionName: '', cancellationDate: getTodayString(), reason: '', refundIssued: 'No', fitsRefundPolicy: 'No' });
  };
  
  const handleRemoveCancellation = (idToRemove: string) => {
      setSessionCancellations(prev => prev.filter(c => c.id !== idToRemove));
  };

  const handleAddCommunication = () => {
      if (!newCommunication.subject.trim() || !newCommunication.notes.trim()) {
          alert("Please provide a subject and notes for the communication.");
          return;
      }
      const newRecord: CommunicationLog = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          ...newCommunication
      };
      setCommunications(prev => [newRecord, ...prev]);
      setNewCommunication({ type: 'Email', subject: '', notes: '' });
  };
  
  const handleAddCoachComment = () => {
      if (!newCoachComment.trim()) return;
      const newRecord: CoachComment = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          comment: newCoachComment.trim(),
      };
      setCoachCommentsLog(prev => [newRecord, ...prev]);
      setNewCoachComment('');
  };
  
  const handleAddPhotoLink = () => {
      if (!newPhotoLink.url.trim() || !newPhotoLink.description.trim()) {
          alert("Please provide both a URL and a description for the photo link.");
          return;
      }
      if (!/^(https?:\/\/).+/.test(newPhotoLink.url)) {
          setErrors(prev => ({...prev, photoLinkUrl: 'Please enter a valid URL.'}));
          return;
      }
      const newRecord: PhotoLink = {
          id: crypto.randomUUID(),
          ...newPhotoLink
      };
      setPhotoLinks(prev => [...prev, newRecord]);
      setNewPhotoLink({ url: '', description: '' });
      if (errors.photoLinkUrl) setErrors(prev => ({ ...prev, photoLinkUrl: undefined }));
  };

  const handleAffiliationChange = (affiliation: string) => {
    setSelectedAffiliations(prev => 
      prev.includes(affiliation)
        ? prev.filter(a => a !== affiliation)
        : [...prev, affiliation]
    );
  };

  const handleAddGroup = async () => {
    if (!hasPermission('canManageGroups')) return;
    const trimmedName = newGroupName.trim();
    if (trimmedName && !groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase())) {
        try {
            const newGroupData = { name: trimmedName, subgroups: [] };
            const newGroupFromApi = await apiClient.createGroup(newGroupData);
            setGroups([...groups, newGroupFromApi]);
            setNewGroupName('');
        } catch (error) {
            console.error("Failed to add group:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'Could not add group.'}`);
        }
    }
  };

  const handleDeleteGroup = async (groupIdToDelete: string) => {
      if (!hasPermission('canManageGroups')) return;
      const groupName = groupMap.get(groupIdToDelete)?.name || 'this group';
      if (window.confirm(`Are you sure you want to delete the "${groupName}" group and all its subgroups? Members in this group will become unassigned.`)) {
          try {
              await apiClient.deleteGroup(groupIdToDelete);
              setGroups(groups.filter(g => g.id !== groupIdToDelete));
              setMembers(members.map(m => m.groupId === groupIdToDelete ? { ...m, groupId: undefined, subgroup: undefined } : m));
          } catch (error) {
              console.error("Failed to delete group:", error);
              alert(`Error: ${error instanceof Error ? error.message : 'Could not delete group.'}`);
          }
      }
  };

  const handleAddSubgroup = async (groupId: string) => {
      if (!hasPermission('canManageGroups') || !newSubgroupName.trim() || !editingGroupIdForSubgroup) return;
      const trimmedName = newSubgroupName.trim();
      
      const groupToUpdate = groupMap.get(groupId);
      if (!groupToUpdate) return;
      
      if (groupToUpdate.subgroups.some(sg => sg.toLowerCase() === trimmedName.toLowerCase())) {
          alert(`Subgroup "${trimmedName}" already exists in this group.`);
          return;
      }
      
      const updatedGroup = { ...groupToUpdate, subgroups: [...groupToUpdate.subgroups, trimmedName] };

      try {
          const updatedGroupFromApi = await apiClient.updateGroup(groupId, updatedGroup);
          setGroups(groups.map(g => g.id === groupId ? updatedGroupFromApi : g));
          setNewSubgroupName('');
          setEditingGroupIdForSubgroup('');
      } catch (error) {
          console.error("Failed to add subgroup:", error);
          alert(`Error: ${error instanceof Error ? error.message : 'Could not add subgroup.'}`);
      }
  };

  const handleDeleteSubgroup = async (groupId: string, subgroupToDelete: string) => {
      if (!hasPermission('canManageGroups')) return;
      if (window.confirm(`Are you sure you want to delete the "${subgroupToDelete}" subgroup? Members will remain in the parent group.`)) {
          const groupToUpdate = groupMap.get(groupId);
          if (!groupToUpdate) return;
          
          const updatedGroup = { ...groupToUpdate, subgroups: groupToUpdate.subgroups.filter(sg => sg !== subgroupToDelete) };
          
          try {
              const updatedGroupFromApi = await apiClient.updateGroup(groupId, updatedGroup);
              setGroups(groups.map(g => g.id === groupId ? updatedGroupFromApi : g));
              setMembers(members.map(m => (m.groupId === groupId && m.subgroup === subgroupToDelete) ? { ...m, subgroup: undefined } : m));
          } catch (error) {
              console.error("Failed to delete subgroup:", error);
              alert(`Error: ${error instanceof Error ? error.message : 'Could not delete subgroup.'}`);
          }
      }
  };

  const handleSaveGroupName = async () => {
    if (!editingGroupNameId) return;
    const trimmedName = editingGroupNewName.trim();
    if (!trimmedName) {
        alert("Group name cannot be empty.");
        return;
    }
    if (groups.some(g => g.id !== editingGroupNameId && g.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert(`A group named "${trimmedName}" already exists.`);
        return;
    }
    
    const groupToUpdate = groupMap.get(editingGroupNameId);
    if (!groupToUpdate) return;

    const updatedGroupData = { ...groupToUpdate, name: trimmedName };

    try {
        const updatedGroupFromApi = await apiClient.updateGroup(editingGroupNameId, updatedGroupData);
        setGroups(groups.map(g => g.id === editingGroupNameId ? updatedGroupFromApi : g));
        setEditingGroupNameId(null);
        setEditingGroupNewName('');
    } catch (error) {
        console.error("Failed to save group name:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not save group name.'}`);
    }
  };

  const handleSaveSubgroupName = async () => {
    if (!editingSubgroup) return;
    const { groupId, originalName } = editingSubgroup;
    const trimmedName = editingSubgroupNewName.trim();

    if (!trimmedName) {
        alert("Subgroup name cannot be empty.");
        return;
    }
    
    const groupToUpdate = groupMap.get(groupId);
    if (!groupToUpdate) return;
    
    if (groupToUpdate.subgroups.some(sg => sg.toLowerCase() === trimmedName.toLowerCase() && sg !== originalName)) {
        alert(`A subgroup named "${trimmedName}" already exists in this group.`);
        return;
    }
    
    const updatedGroupData = {
        ...groupToUpdate,
        subgroups: groupToUpdate.subgroups.map(sg => sg === originalName ? trimmedName : sg)
    };

    try {
        const updatedGroupFromApi = await apiClient.updateGroup(groupId, updatedGroupData);
        setGroups(groups.map(g => g.id === groupId ? updatedGroupFromApi : g));
        setMembers(members.map(m => (m.groupId === groupId && m.subgroup === originalName) ? { ...m, subgroup: trimmedName } : m));
        setEditingSubgroup(null);
        setEditingSubgroupNewName('');
    } catch (error) {
        console.error("Failed to save subgroup name:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not save subgroup name.'}`);
    }
  };


  const executeExport = () => {
    if (!hasPermission('canImportExport')) return;
    const dataToExport: ImportData = {
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
      if (!hasPermission('canImportExport')) return;
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const imported = JSON.parse(event.target?.result as string);
                  if (imported.members && imported.groups) {
                      setImportFileData(imported);
                      setShowImportConfirm(true);
                  } else {
                      alert("Invalid file format. Must contain 'members' and 'groups' arrays.");
                  }
              } catch (err) {
                  alert("Error reading or parsing file.");
              } finally {
                  if (e.target) e.target.value = ''; // Reset file input
              }
          };
          reader.readAsText(file);
      }
  };

  const executeImport = async () => {
    if (!importFileData) return;
    alert("Full JSON import is a high-risk operation. The CSV import is recommended for adding/updating data.");
    setShowImportConfirm(false);
    setImportFileData(null);
  };

  const downloadCsvTemplate = () => {
    const headers = [
        'name', 'role', 'email', 'status', 'memberType', 'phone', 'address', 'bio',
        'dateJoined', 'birthdate', 'gender', 'groupName', 'subgroup', 'affiliations',
        'elementarySchool', 'highSchool', 'schoolVolleyballLevel', 'clubVolleyball',
        'academyLevel', 'playerVolleyballAchievements', 'academyAchievements',
        'postAcademyAchievements', 'academySessionsAttended'
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "member_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvString = event.target?.result;
            if (typeof csvString !== 'string' || !csvString.trim()) {
                throw new Error("File is empty or could not be read as text.");
            }
            
            const lines = csvString.trim().split(/\r\n|\n/);
            const headers = parseCsvLine(lines[0]).map(h => h.trim());
            const data: CsvImportData = { newMembers: [], updatedMembers: [], errors: [] };

            const listFields = new Set(['affiliations', 'playerVolleyballAchievements', 'academyAchievements', 'postAcademyAchievements', 'academySessionsAttended']);

            const groupNameToId = new Map(groups.map(g => [g.name.toLowerCase(), g.id]));

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue; // Skip empty lines

                const values = parseCsvLine(lines[i]);
                if (values.length !== headers.length) {
                    data.errors.push({ row: i + 1, message: `Incorrect number of columns. Expected ${headers.length}, found ${values.length}.`});
                    continue;
                }
                const rowData: any = {};
                headers.forEach((header, index) => {
                    const value = values[index];
                    if (listFields.has(header)) {
                        rowData[header] = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
                    } else {
                        rowData[header] = value;
                    }
                });

                if (!rowData.name) {
                    data.errors.push({ row: i + 1, message: "Missing required field: 'name'."});
                    continue;
                }
                if (rowData.email && !/\S+@\S+\.\S+/.test(rowData.email)) {
                    data.errors.push({ row: i + 1, message: `Invalid email format for '${rowData.email}'.`});
                    continue;
                }
                
                const existingMember = rowData.email ? members.find(m => m.email && m.email.toLowerCase() === rowData.email.toLowerCase()) : null;

                const importedMember: Partial<Member> = {
                    name: rowData.name,
                    role: rowData.role || '',
                    email: rowData.email || '',
                    status: ['Active', 'Inactive', 'Pending'].includes(rowData.status) ? rowData.status : 'Active',
                    memberType: ALL_MEMBER_TYPES.includes(rowData.memberType) ? rowData.memberType : 'N/A',
                    phone: rowData.phone || '',
                    address: rowData.address || '',
                    bio: rowData.bio || '',
                    dateJoined: rowData.dateJoined ? new Date(rowData.dateJoined).toISOString() : new Date().toISOString(),
                    birthdate: rowData.birthdate || '',
                    gender: rowData.gender || '',
                    affiliations: rowData.affiliations || [],
                    elementarySchool: rowData.elementarySchool || '',
                    highSchool: rowData.highSchool || '',
                    schoolVolleyballLevel: rowData.schoolVolleyballLevel || '',
                    clubVolleyball: rowData.clubVolleyball || '',
                    academyLevel: Object.keys(ACADEMY_LEVELS).includes(rowData.academyLevel) ? rowData.academyLevel : 'N/A',
                    playerVolleyballAchievements: rowData.playerVolleyballAchievements || [],
                    academyAchievements: rowData.academyAchievements || [],
                    postAcademyAchievements: rowData.postAcademyAchievements || [],
                    academySessionsAttended: rowData.academySessionsAttended || [],
                };

                if (rowData.groupName) {
                    const groupId = groupNameToId.get(rowData.groupName.toLowerCase());
                    if (groupId) {
                        importedMember.groupId = groupId;
                        const group = groupMap.get(groupId);
                        if (rowData.subgroup && group?.subgroups.includes(rowData.subgroup)) {
                            importedMember.subgroup = rowData.subgroup;
                        }
                    } else {
                        data.errors.push({ row: i + 1, message: `Group '${rowData.groupName}' not found. Member will be unassigned.`});
                    }
                }

                if (existingMember) {
                    data.updatedMembers.push({ member: { ...existingMember, ...importedMember }, original: existingMember });
                } else {
                    const newMember: Member = {
                        ...importedMember,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString(),
                        activityLog: [{ timestamp: new Date().toISOString(), event: "Member record created via CSV import." }],
                        communications: [{ id: crypto.randomUUID(), type: 'Memo', date: new Date().toISOString(), subject: 'System Import', notes: 'Member record created via CSV import.' }],
                    } as Member;
                    data.newMembers.push(newMember);
                }
            }
            setCsvImportData(data);
            setShowCsvImportConfirm(true);
        } catch (err) {
            console.error("CSV Parsing Error:", err);
            alert(`Failed to process CSV file. ${err instanceof Error ? err.message : 'Please check the file format and try again.'}`);
        } finally {
            if (e.target) e.target.value = ''; // Reset file input
        }
    };
    reader.readAsText(file);
  };

  const executeCsvImport = async () => {
    if (!csvImportData) return;
    
    setIsSubmitting(true);
    try {
        const updatedMembersFromApi = await apiClient.bulkImport(csvImportData);
        setMembers(updatedMembersFromApi);
        setShowCsvImportConfirm(false);
        setCsvImportData(null);
        alert(`Import complete! ${csvImportData.newMembers.length} members added, ${csvImportData.updatedMembers.length} members updated.`);
    } catch (error) {
        console.error("Failed to execute CSV import:", error);
        alert(`Error: ${error instanceof Error ? error.message : 'Could not complete the import.'}`);
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleRoleChange = async (role: string) => {
      try {
        await apiClient.saveUserRole(role as UserRole);
        setCurrentUserRole(role as UserRole);
      } catch (error) {
        console.error("Failed to save user role:", error);
        alert('Could not save user role preference.');
      }
  }

  const addRecentSearch = async (term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;
    
    const updatedSearches = [
        trimmedTerm,
        ...recentSearches.filter(s => s.toLowerCase() !== trimmedTerm.toLowerCase())
    ].slice(0, 5); // Keep the 5 most recent
    
    setRecentSearches(updatedSearches);
    try {
        await apiClient.saveRecentSearches(updatedSearches);
    } catch (error) {
        console.error("Failed to save recent searches:", error);
    }
  };

  const handleSelectRecentSearch = (term: string) => {
      setSearchTerm(term);
      setIsRecentSearchesOpen(false);
  };

  const handleClearRecentSearches = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setRecentSearches([]);
      try {
        await apiClient.saveRecentSearches([]);
      } catch (error) {
        console.error("Failed to clear recent searches:", error);
      }
      setIsRecentSearchesOpen(false);
  };

  const handleCopyId = (id: string) => {
      if (isIdCopied) return;
      navigator.clipboard.writeText(id).then(() => {
          setIsIdCopied(true);
          setTimeout(() => setIsIdCopied(false), 2000);
      }).catch(err => {
          console.error('Failed to copy ID: ', err);
          alert('Failed to copy ID to clipboard.');
      });
  };

  const hierarchicalRoles = useMemo(() => {
    type RoleNode = { role: UserRole; children: RoleNode[] };
    const tree: RoleNode[] = [];
    const map = new Map<UserRole, RoleNode>();

    ALL_ROLES.forEach(role => {
      map.set(role, { role, children: [] });
    });

    ALL_ROLES.forEach(role => {
      const node = map.get(role)!;
      const parentRole = PERMISSIONS[role].parent;
      if (parentRole) {
        map.get(parentRole)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    const flattenTree = (nodes: RoleNode[], level = 0): { role: UserRole; level: number }[] => {
      let result: { role: UserRole; level: number }[] = [];
      for (const node of nodes) {
        result.push({ role: node.role, level });
        if (node.children.length > 0) {
          result = result.concat(flattenTree(node.children, level + 1));
        }
      }
      return result;
    };

    return flattenTree(tree);
  }, []);

  const allAffiliations = useMemo(() => {
    const affiliationsSet = new Set<string>();
    members.forEach(member => {
      member.affiliations?.forEach(aff => affiliationsSet.add(aff));
    });
    return Array.from(affiliationsSet).sort((a, b) => a.localeCompare(b));
  }, [members]);


  const filteredMembers = useMemo(() => members
    .filter(member => statusFilter === 'All' || member.status === statusFilter)
    .filter(member => memberTypeFilter === 'All' || (member.memberType || 'N/A') === memberTypeFilter)
    .filter(member => selectedAffiliations.length === 0 || (member.affiliations && selectedAffiliations.some(filterAff => member.affiliations.includes(filterAff))))
    .filter(member => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        return (
          member.name.toLowerCase().includes(term) ||
          member.role.toLowerCase().includes(term) ||
          member.bio.toLowerCase().includes(term) ||
          (member.affiliations && member.affiliations.some(aff => aff.toLowerCase().includes(term))) ||
          (member.email && member.email.toLowerCase().includes(term)) ||
          (member.phone && member.phone.includes(term)) ||
          (member.highSchool && member.highSchool.toLowerCase().includes(term)) ||
          (member.clubVolleyball && member.clubVolleyball.toLowerCase().includes(term))
        );
    }), [members, statusFilter, memberTypeFilter, selectedAffiliations, searchTerm]);

  const sortedMembers = useMemo(() => {
    const sortableItems = [...filteredMembers];
    if (sortConfig) {
        sortableItems.sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue = a[key as keyof Member];
            let bValue = b[key as keyof Member];

            if (key === 'dateJoined') {
                const dateA = aValue ? new Date(aValue as string).getTime() : 0;
                const dateB = bValue ? new Date(bValue as string).getTime() : 0;
                if (direction === 'asc') {
                    return dateA - dateB;
                }
                return dateB - dateA;
            }
            
            if (key === 'memberType') {
                aValue = a.memberType || 'N/A';
                bValue = b.memberType || 'N/A';
            }

            const valA = (aValue || '').toString();
            const valB = (bValue || '').toString();

            if (direction === 'asc') {
                return valA.localeCompare(valB);
            }
            return valB.localeCompare(valA);
        });
    }
    return sortableItems;
  }, [filteredMembers, sortConfig]);
    
  const groupedMembers = useMemo(() => {
    const grouped: { [key: string]: Member[] } = {};
    sortedMembers.forEach(member => {
        if (member.groupId) {
            if (!grouped[member.groupId]) {
                grouped[member.groupId] = [];
            }
            grouped[member.groupId].push(member);
        }
    });
    return grouped;
  }, [sortedMembers]);

  const sortedGroupIdsInView = useMemo(() => {
    return Object.keys(groupedMembers).sort((a, b) => {
        const groupA = groupMap.get(a);
        const groupB = groupMap.get(b);
        if (!groupA || !groupB) return 0;
        return groupA.name.localeCompare(groupB.name);
    });
  }, [groupedMembers, groupMap]);
  
  const unassignedMembers = useMemo(() => {
    return sortedMembers.filter(m => !m.groupId);
  }, [sortedMembers]);

  const groupMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groups.forEach(g => counts.set(g.id, 0));
    members.forEach(m => {
        if (m.groupId && counts.has(m.groupId)) {
            counts.set(m.groupId, (counts.get(m.groupId) || 0) + 1);
        }
    });
    return counts;
  }, [members, groups]);

  const dashboardStats = useMemo(() => {
    if (!members || members.length === 0) return null;

    const statusCounts = {
      Active: members.filter(m => m.status === 'Active').length,
      Inactive: members.filter(m => m.status === 'Inactive').length,
      Pending: members.filter(m => m.status === 'Pending').length,
    };

    const groupCounts: { [key: string]: number } = {};
    groups.forEach(g => { groupCounts[g.name] = 0; });
    groupCounts['Unassigned'] = 0;

    let maxGroupCount = 0;
    members.forEach(m => {
      const groupName = m.groupId ? groupMap.get(m.groupId)?.name || 'Unassigned' : 'Unassigned';
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
  }, [members, groups, groupMap]);
  
  const requestSort = (key: SortConfig['key']) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const SortButton = ({ sortKey, label }: { sortKey: SortConfig['key'], label: string }) => {
      const isActive = sortConfig?.key === sortKey;
      const directionIcon = sortConfig?.direction === 'asc' ? '↓' : '↑';
      return (
          <button
              type="button"
              onClick={() => requestSort(sortKey)}
              className={`sort-button ${isActive ? 'active' : ''}`}
              aria-label={`Sort by ${label} ${isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : ''}`}
              title={`Sort by ${label}`}
          >
              {label} {isActive && <span className="sort-icon">{directionIcon}</span>}
          </button>
      );
  };

  const selectedGroupForForm = groups.find(g => g.id === groupId);
  const showForm = editingMemberId || hasPermission('canAddMembers');
  const showRestorePrompt = draftData && draftData.editingId === editingMemberId;
  const formActionText = editingMemberId ? 'Edit Member' : 'Add a New Member';
  
  if (isLoading) {
    return <div className="loading-overlay">Loading Community Data...</div>;
  }

  return (
    <main>
      <header>
        <h1>Community Members</h1>
      </header>
      <section className="role-switcher-section" aria-labelledby="role-switcher-heading">
          <h3 id="role-switcher-heading">Current User Role</h3>
           <div className="role-switcher">
                <label htmlFor="role-select" className="visually-hidden">Select your role</label>
                <select 
                    id="role-select"
                    value={currentUserRole} 
                    onChange={(e) => handleRoleChange(e.target.value)}
                    disabled={!getPermissionValue('SuperAdmin', 'canChangeRoles') && currentUserRole !== 'SuperAdmin'}
                    title={hasPermission('canChangeRoles') ? "Change the current user role to test permissions" : "You do not have permission to change roles"}
                >
                    {hierarchicalRoles.map(({ role, level }) => (
                        <option key={role} value={role}>
                            {'\u00A0\u00A0'.repeat(level)}{role.replace(/([A-Z])/g, ' $1').trim()}
                        </option>
                    ))}
                </select>
            </div>
            <p className="role-description">
                {PERMISSIONS[currentUserRole]?.description}
            </p>
      </section>

      {hasPermission('canViewDashboard') && (
        <section className="admin-actions">
          <button type="button" onClick={() => setIsDashboardOpen(true)} title="Open the admin dashboard for community stats">View Dashboard</button>
        </section>
      )}

      {showForm && (
        <section className="form-section" aria-labelledby="form-heading">
          {showRestorePrompt && (
            <div className="draft-banner">
              <p>You have an unsaved draft from your last session.</p>
              <div className="draft-banner-actions">
                <button type="button" onClick={restoreDraft} className="draft-restore-button">Restore Draft</button>
                <button type="button" onClick={clearDraft} className="draft-discard-button">Discard</button>
              </div>
            </div>
          )}
          <h2 id="form-heading">{formActionText}</h2>
          <form onSubmit={handleSubmit} noValidate>
            <fieldset>
                <legend>Primary Information</legend>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <div className="input-wrapper">
                    <input id="name" type="text" value={name} onChange={(e) => {setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));}} placeholder="e.g., Jane Doe" required aria-required="true" aria-invalid={!!errors.name} aria-describedby="name-error" className={errors.name ? 'error' : ''} disabled={!canEditField('name')} />
                    {errors.name && <div className="error-icon" aria-hidden="true">!</div>}
                  </div>
                  {errors.name && <p id="name-error" className="error-message">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label htmlFor="memberType">Member Type</label>
                  <select id="memberType" value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)} disabled={!canEditField('memberType')}>
                    {ALL_MEMBER_TYPES.map(type => (
                      <option key={type} value={type}>{type === 'N/A' ? 'Not Applicable' : type.replace(/([A-Z])/g, ' $1').trim()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <div className="input-wrapper">
                    <input id="role" type="text" value={role} onChange={(e) => {setRole(e.target.value); if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));}} placeholder="e.g., Software Engineer" required aria-required="true" aria-invalid={!!errors.role} aria-describedby="role-error" className={errors.role ? 'error' : ''} disabled={!canEditField('role')} />
                    {errors.role && <div className="error-icon" aria-hidden="true">!</div>}
                  </div>
                  {errors.role && <p id="role-error" className="error-message">{errors.role}</p>}
                </div>
                 <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value as MemberStatus)} disabled={!canEditField('status')}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="form-group">
                    <label htmlFor="group">Group</label>
                    <select id="group" value={groupId} onChange={e => {setGroupId(e.target.value); setSubgroup('')}} disabled={!canEditField('groupId')}>
                        <option value="">Unassigned</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
                {selectedGroupForForm && selectedGroupForForm.subgroups.length > 0 && (
                    <div className="form-group">
                        <label htmlFor="subgroup">Subgroup</label>
                        <select id="subgroup" value={subgroup} onChange={e => setSubgroup(e.target.value)} disabled={!canEditField('subgroup')}>
                            <option value="">None</option>
                            {selectedGroupForForm.subgroups.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                        </select>
                    </div>
                )}
            </fieldset>

            <fieldset>
                <legend>Profile & Bio</legend>
                 <div className="form-group">
                  <label htmlFor="imageUrl">Profile Picture URL</label>
                  <div className="image-input-group">
                    <div className="input-wrapper">
                        <input id="imageUrl" type="text" value={imageUrl} onChange={(e) => {setImageUrl(e.target.value); if(errors.imageUrl) setErrors(prev => ({...prev, imageUrl: undefined}));}} placeholder="https://example.com/image.jpg" aria-invalid={!!errors.imageUrl} aria-describedby="imageUrl-error" className={errors.imageUrl ? 'error' : ''} disabled={!canEditField('imageUrl')} />
                         {errors.imageUrl && <div className="error-icon" aria-hidden="true">!</div>}
                    </div>
                    <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()} title="Upload an image from your device" aria-label="Upload an image from your device" disabled={!canEditField('imageUrl')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                    <button type="button" className="camera-button" onClick={openCamera} title="Take a photo with your camera" aria-label="Take a photo with your camera" disabled={!canEditField('imageUrl')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-2 4h4v-1.08c-1.14-.38-2.86-.38-4 0V16zm8-10H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H6V8h12v8z"/></svg>
                    </button>
                  </div>
                  {errors.imageUrl && <p id="imageUrl-error" className="error-message">{errors.imageUrl}</p>}
                   <div className="image-preview-container">
                        <p>Image Preview:</p>
                        <img 
                            src={imageUrl || generateAvatar(name, editingMemberId || name)} 
                            alt={name ? `${name}'s profile picture preview` : 'Profile picture preview'} 
                            className="form-image-preview"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src !== generateAvatar(name, editingMemberId || name)) {
                                    target.src = generateAvatar(name, editingMemberId || name);
                                }
                            }}
                        />
                   </div>
                </div>
                 <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                   <div className="input-wrapper">
                    <RichTextEditor 
                        value={bio}
                        onChange={(html) => {
                            setBio(html);
                            if (errors.bio) {
                                const textContent = html.replace(/<[^>]*>?/gm, '').trim();
                                if (textContent) setErrors(prev => ({ ...prev, bio: undefined }));
                            }
                        }}
                        placeholder="Share a bit about this member..."
                        error={!!errors.bio}
                        disabled={!canEditField('bio')}
                    />
                    {errors.bio && <div className="error-icon" aria-hidden="true">!</div>}
                  </div>
                  {errors.bio && <p id="bio-error" className="error-message">{errors.bio}</p>}
                </div>
            </fieldset>

            <fieldset>
              <legend>Contact & Personal Details</legend>
               <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <input id="email" type="email" value={email} onChange={(e) => {setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));}} placeholder="jane.doe@example.com" aria-invalid={!!errors.email} aria-describedby="email-error" className={errors.email ? 'error' : ''} disabled={!canEditField('email')} />
                  {errors.email && <div className="error-icon" aria-hidden="true">!</div>}
                </div>
                {errors.email && <p id="email-error" className="error-message">{errors.email}</p>}
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(123) 456-7890" disabled={!canEditField('phone')} />
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input id="address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Anytown, USA" disabled={!canEditField('address')} />
              </div>
              <div className="form-group">
                <label htmlFor="birthdate">Date of Birth</label>
                <div className="input-wrapper">
                  <input id="birthdate" type="date" value={birthdate} onChange={(e) => {setBirthdate(e.target.value); if (errors.birthdate) setErrors(prev => ({...prev, birthdate: undefined}));}} aria-invalid={!!errors.birthdate} aria-describedby="birthdate-error" className={errors.birthdate ? 'error' : ''} max={getTodayString()} disabled={!canEditField('birthdate')} />
                  {errors.birthdate && <div className="error-icon" aria-hidden="true">!</div>}
                </div>
                 {errors.birthdate && <p id="birthdate-error" className="error-message">{errors.birthdate}</p>}
              </div>
               <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <input id="gender" type="text" value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g., Female, Male, Non-binary" disabled={!canEditField('gender')} />
              </div>
              <div className="form-group">
                <label htmlFor="dateJoined">Date Joined</label>
                <input id="dateJoined" type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} disabled={!canEditField('dateJoined')} />
              </div>
            </fieldset>
            
             <fieldset>
                <legend>Relationship</legend>
                <div className="form-group">
                    <label htmlFor="relationshipType">Relationship Type</label>
                    <input id="relationshipType" type="text" value={relationship.relationshipType} onChange={(e) => setRelationship(prev => ({...prev, relationshipType: e.target.value}))} placeholder="e.g., Parent of, Sibling of" disabled={!canEditField('relationship')} />
                </div>
                 <div className="form-group">
                    <label htmlFor="relatedMemberId">Related To</label>
                    <select id="relatedMemberId" value={relationship.relatedMemberId} onChange={(e) => setRelationship(prev => ({...prev, relatedMemberId: e.target.value}))} disabled={!canEditField('relationship')}>
                        <option value="">Select a Member</option>
                        {members
                            .filter(m => m.id !== editingMemberId) // Exclude self
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        }
                    </select>
                </div>
                 {relationship.relatedMemberId && (
                     <button type="button" className="clear-button" onClick={() => setRelationship({ relatedMemberId: '', relationshipType: '' })} disabled={!canEditField('relationship')}>
                         Clear Relationship
                     </button>
                 )}
            </fieldset>

            <fieldset>
              <legend>Education & Volleyball History</legend>
              <div className="form-group">
                <label htmlFor="elementarySchool">Elementary School</label>
                <input id="elementarySchool" type="text" value={elementarySchool} onChange={(e) => setElementarySchool(e.target.value)} disabled={!canEditField('elementarySchool')} />
              </div>
              <div className="form-group">
                <label htmlFor="highSchool">High School</label>
                <input id="highSchool" type="text" value={highSchool} onChange={(e) => setHighSchool(e.target.value)} disabled={!canEditField('highSchool')} />
              </div>
              <div className="form-group">
                <label htmlFor="schoolVolleyballLevel">School Level Volleyball Played</label>
                <input id="schoolVolleyballLevel" type="text" value={schoolVolleyballLevel} onChange={(e) => setSchoolVolleyballLevel(e.target.value)} placeholder="e.g., Varsity, JV" disabled={!canEditField('schoolVolleyballLevel')} />
              </div>
              <div className="form-group">
                <label htmlFor="clubVolleyball">Club Played</label>
                <input id="clubVolleyball" type="text" value={clubVolleyball} onChange={(e) => setClubVolleyball(e.target.value)} placeholder="e.g., Local Club Name" disabled={!canEditField('clubVolleyball')} />
              </div>
            </fieldset>
            
            <fieldset>
              <legend>Academy & Achievements</legend>
               <div className="form-group">
                  <label htmlFor="academyLevel">Player Academy Level</label>
                  <select id="academyLevel" value={academyLevel} onChange={(e) => setAcademyLevel(e.target.value as AcademyLevel)} disabled={!canEditField('academyLevel')}>
                      {Object.entries(ACADEMY_LEVELS).map(([key, { title, description }]) => (
                          <option key={key} value={key} title={description}>{title}</option>
                      ))}
                  </select>
                </div>

              <div className="form-group">
                <label htmlFor="playerVolleyballAchievements">Player Volleyball Achievements</label>
                <div className="form-group-inline">
                  <div>
                    <input id="playerVolleyballAchievements" type="text" value={currentPVAchievement} onChange={(e) => setCurrentPVAchievement(e.target.value)} placeholder="e.g., MVP, All-Star" disabled={!canEditField('playerVolleyballAchievements')} />
                  </div>
                  <button type="button" className="add-button" onClick={() => { if (currentPVAchievement.trim()) { setPlayerVolleyballAchievements(prev => [...prev, currentPVAchievement.trim()]); setCurrentPVAchievement(''); } }} disabled={!canEditField('playerVolleyballAchievements')}>Add</button>
                </div>
                <ul className="tag-list">
                  {playerVolleyballAchievements.map((item, index) => (
                    <li key={index} className="tag-item">
                      <span>{item}</span>
                      <button type="button" className="remove-tag-button" onClick={() => setPlayerVolleyballAchievements(prev => prev.filter((_, i) => i !== index))} disabled={!canEditField('playerVolleyballAchievements')}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="academyAchievements">Academy Achievements</label>
                <div className="form-group-inline">
                  <div>
                    <input id="academyAchievements" type="text" value={currentAAchievement} onChange={(e) => setCurrentAAchievement(e.target.value)} placeholder="e.g., Most Improved" disabled={!canEditField('academyAchievements')} />
                  </div>
                  <button type="button" className="add-button" onClick={() => { if (currentAAchievement.trim()) { setAcademyAchievements(prev => [...prev, currentAAchievement.trim()]); setCurrentAAchievement(''); } }} disabled={!canEditField('academyAchievements')}>Add</button>
                </div>
                <ul className="tag-list">
                  {academyAchievements.map((item, index) => (
                    <li key={index} className="tag-item">
                      <span>{item}</span>
                      <button type="button" className="remove-tag-button" onClick={() => setAcademyAchievements(prev => prev.filter((_, i) => i !== index))} disabled={!canEditField('academyAchievements')}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="form-group">
                <label htmlFor="postAcademyAchievements">Post-Academy Achievements</label>
                <div className="form-group-inline">
                  <div>
                    <input id="postAcademyAchievements" type="text" value={currentPostAAchievement} onChange={(e) => setCurrentPostAAchievement(e.target.value)} placeholder="e.g., College Scholarship" disabled={!canEditField('postAcademyAchievements')} />
                  </div>
                  <button type="button" className="add-button" onClick={() => { if (currentPostAAchievement.trim()) { setPostAcademyAchievements(prev => [...prev, currentPostAAchievement.trim()]); setCurrentPostAAchievement(''); } }} disabled={!canEditField('postAcademyAchievements')}>Add</button>
                </div>
                <ul className="tag-list">
                  {postAcademyAchievements.map((item, index) => (
                    <li key={index} className="tag-item">
                      <span>{item}</span>
                      <button type="button" className="remove-tag-button" onClick={() => setPostAcademyAchievements(prev => prev.filter((_, i) => i !== index))} disabled={!canEditField('postAcademyAchievements')}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="academySessionsAttended">Academy Sessions Attended</label>
                <div className="form-group-inline">
                  <div>
                    <input id="academySessionsAttended" type="text" value={currentSession} onChange={(e) => setCurrentSession(e.target.value)} placeholder="e.g., Summer Camp 2023" disabled={!canEditField('academySessionsAttended')} />
                  </div>
                  <button type="button" className="add-button" onClick={() => { if (currentSession.trim()) { setAcademySessionsAttended(prev => [...prev, currentSession.trim()]); setCurrentSession(''); } }} disabled={!canEditField('academySessionsAttended')}>Add</button>
                </div>
                <ul className="tag-list">
                  {academySessionsAttended.map((item, index) => (
                    <li key={index} className="tag-item">
                      <span>{item}</span>
                      <button type="button" className="remove-tag-button" onClick={() => setAcademySessionsAttended(prev => prev.filter((_, i) => i !== index))} disabled={!canEditField('academySessionsAttended')}>&times;</button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="totalAcademySessions">Total Academy Sessions</label>
                <input id="totalAcademySessions" type="number" value={totalAcademySessions} onChange={(e) => setTotalAcademySessions(e.target.value)} placeholder="e.g., 25" disabled={!canEditField('totalAcademySessions')} />
              </div>
              <div className="form-group">
                <label htmlFor="academyHours">Academy Hours</label>
                <input id="academyHours" type="number" value={academyHours} onChange={(e) => setAcademyHours(e.target.value)} placeholder="e.g., 50" disabled={!canEditField('academyHours')} />
              </div>
              <div className="form-group">
                <label htmlFor="academyCoaches">Academy Coach(es) Involved</label>
                <input id="academyCoaches" type="text" value={academyCoaches} onChange={(e) => setAcademyCoaches(e.target.value)} placeholder="e.g., Coach Smith, Coach Jones" disabled={!canEditField('academyCoaches')} />
              </div>
              <div className="form-group">
                <label htmlFor="sessionsFeedback">Sessions Feedback</label>
                <textarea id="sessionsFeedback" rows={4} value={sessionsFeedback} onChange={(e) => setSessionsFeedback(e.target.value)} disabled={!canEditField('sessionsFeedback')}></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="coachFeedback">Coach Feedback</label>
                <textarea id="coachFeedback" rows={4} value={coachFeedback} onChange={(e) => setCoachFeedback(e.target.value)} disabled={!canEditField('coachFeedback')}></textarea>
              </div>
            </fieldset>
            
            <fieldset>
              <legend>Affiliations</legend>
              <div className="form-group">
                <div className="form-group-inline">
                    <div>
                        <label htmlFor="affiliation-input">Add Affiliation</label>
                        <input
                          id="affiliation-input"
                          type="text"
                          value={currentAffiliation}
                          onChange={(e) => setCurrentAffiliation(e.target.value)}
                          placeholder="e.g., Varsity Team, Volunteer"
                          disabled={!canEditField('affiliations')}
                        />
                    </div>
                  <button type="button" className="add-button" onClick={handleAddAffiliation} disabled={!canEditField('affiliations')}>Add</button>
                </div>
                <ul className="tag-list">
                  {affiliations.map((affiliation, index) => (
                    <li key={index} className="tag-item">
                      <span>{affiliation}</span>
                      <button
                        type="button"
                        className="remove-tag-button"
                        onClick={() => handleRemoveAffiliation(index)}
                        aria-label={`Remove ${affiliation} affiliation`}
                        title={`Remove ${affiliation}`}
                        disabled={!canEditField('affiliations')}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </fieldset>

            <fieldset>
                <legend>Session Cancellations</legend>
                <button type="button" className="secondary-button" onClick={() => setIsRefundPolicyOpen(true)}>View Refund Policy</button>
                <div className="cancellation-form">
                    <div className="form-group">
                        <label htmlFor="cancellation-sessionName">Session Name</label>
                        <input id="cancellation-sessionName" type="text" value={newCancellation.sessionName} onChange={e => setNewCancellation(p => ({...p, sessionName: e.target.value}))} disabled={!canEditField('sessionCancellations')} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="cancellation-date">Cancellation Date</label>
                        <input id="cancellation-date" type="date" value={newCancellation.cancellationDate} onChange={e => setNewCancellation(p => ({...p, cancellationDate: e.target.value}))} max={getTodayString()} disabled={!canEditField('sessionCancellations')} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="cancellation-reason">Reason for Cancellation</label>
                        <textarea id="cancellation-reason" rows={3} value={newCancellation.reason} onChange={e => setNewCancellation(p => ({...p, reason: e.target.value}))} disabled={!canEditField('sessionCancellations')}></textarea>
                    </div>
                    <div className="form-group">
                        <label>Refund Issued?</label>
                        <select value={newCancellation.refundIssued} onChange={e => setNewCancellation(p => ({...p, refundIssued: e.target.value}))} disabled={!canEditField('sessionCancellations')}>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                        </select>
                    </div>
                     <div className="form-group">
                        <label>Fits Refund Policy?</label>
                         <select value={newCancellation.fitsRefundPolicy} onChange={e => setNewCancellation(p => ({...p, fitsRefundPolicy: e.target.value}))} disabled={!canEditField('sessionCancellations')}>
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                        </select>
                    </div>
                    <button type="button" className="add-button" onClick={handleAddCancellation} disabled={!canEditField('sessionCancellations')}>Add Cancellation Record</button>
                </div>
                 {sessionCancellations.length > 0 && (
                     <ul className="cancellation-list">
                         {sessionCancellations.map(c => (
                             <li key={c.id} className="cancellation-item">
                                 <div className="cancellation-item-content">
                                     <strong>{c.sessionName}</strong>
                                     <p><em>Reason:</em> {c.reason}</p>
                                     <span><strong>Refunded:</strong> {c.refundIssued ? 'Yes' : 'No'}</span>
                                     <span><strong>Fits Policy:</strong> {c.fitsRefundPolicy ? 'Yes' : 'No'}</span>
                                 </div>
                                 <button type="button" className="remove-tag-button" onClick={() => handleRemoveCancellation(c.id)} disabled={!canEditField('sessionCancellations')}>&times;</button>
                             </li>
                         ))}
                     </ul>
                 )}
            </fieldset>

             <fieldset>
                <legend>Communications & Logs</legend>

                <div className="log-form-group">
                    <h4>Add Communication Log</h4>
                    <div className="log-form">
                        <div className="form-group">
                            <label htmlFor="comm-type">Type</label>
                            <select id="comm-type" value={newCommunication.type} onChange={e => setNewCommunication(p => ({...p, type: e.target.value as CommunicationType}))} disabled={!canEditField('communications')}>
                                {ALL_COMMUNICATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="comm-subject">Subject</label>
                            <input id="comm-subject" type="text" value={newCommunication.subject} onChange={e => setNewCommunication(p => ({...p, subject: e.target.value}))} disabled={!canEditField('communications')} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="comm-notes">Notes</label>
                            <textarea id="comm-notes" rows={3} value={newCommunication.notes} onChange={e => setNewCommunication(p => ({...p, notes: e.target.value}))} disabled={!canEditField('communications')}></textarea>
                        </div>
                        <button type="button" className="add-button" onClick={handleAddCommunication} disabled={!canEditField('communications')}>Add Log</button>
                    </div>
                    {communications.length > 0 && (
                        <ul className="log-list">
                            {communications.map(item => (
                                <li key={item.id} className="log-item">
                                    <div className="log-item-content">
                                        <strong>{item.subject}</strong> <span className="log-item-meta">({item.type})</span>
                                        <p>{item.notes}</p>
                                        <span className="log-item-meta">{new Date(item.date).toLocaleString()}</span>
                                    </div>
                                    <button type="button" className="remove-tag-button" onClick={() => setCommunications(p => p.filter(c => c.id !== item.id))} disabled={!canEditField('communications')}>&times;</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="log-form-group">
                    <h4>Add Coach's Comment</h4>
                    <div className="log-form">
                         <div className="form-group">
                            <label htmlFor="coach-comment">Comment</label>
                            <textarea id="coach-comment" rows={3} value={newCoachComment} onChange={e => setNewCoachComment(e.target.value)} disabled={!canEditField('coachCommentsLog')}></textarea>
                        </div>
                        <button type="button" className="add-button" onClick={handleAddCoachComment} disabled={!canEditField('coachCommentsLog')}>Add Comment</button>
                    </div>
                     {coachCommentsLog.length > 0 && (
                        <ul className="log-list">
                            {coachCommentsLog.map(item => (
                                <li key={item.id} className="log-item">
                                    <div className="log-item-content">
                                        <p>{item.comment}</p>
                                        <span className="log-item-meta">{new Date(item.date).toLocaleString()}</span>
                                    </div>
                                    <button type="button" className="remove-tag-button" onClick={() => setCoachCommentsLog(p => p.filter(c => c.id !== item.id))} disabled={!canEditField('coachCommentsLog')}>&times;</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                 <div className="log-form-group">
                    <h4>Add Photo Link</h4>
                    <div className="log-form">
                         <div className="form-group">
                            <label htmlFor="photo-url">URL</label>
                             <div className="input-wrapper">
                                <input id="photo-url" type="text" value={newPhotoLink.url} onChange={e => setNewPhotoLink(p => ({...p, url: e.target.value}))} placeholder="https://photos.example.com/album" className={errors.photoLinkUrl ? 'error' : ''} disabled={!canEditField('photoLinks')} />
                                {errors.photoLinkUrl && <div className="error-icon" aria-hidden="true">!</div>}
                             </div>
                              {errors.photoLinkUrl && <p className="error-message">{errors.photoLinkUrl}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="photo-desc">Description</label>
                            <input id="photo-desc" type="text" value={newPhotoLink.description} onChange={e => setNewPhotoLink(p => ({...p, description: e.target.value}))} placeholder="e.g., Summer Camp 2024 Gallery" disabled={!canEditField('photoLinks')} />
                        </div>
                        <button type="button" className="add-button" onClick={handleAddPhotoLink} disabled={!canEditField('photoLinks')}>Add Link</button>
                    </div>
                     {photoLinks.length > 0 && (
                        <ul className="log-list">
                            {photoLinks.map(item => (
                                <li key={item.id} className="log-item">
                                    <div className="log-item-content">
                                        <strong>{item.description}</strong>
                                        <p><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a></p>
                                    </div>
                                    <button type="button" className="remove-tag-button" onClick={() => setPhotoLinks(p => p.filter(c => c.id !== item.id))} disabled={!canEditField('photoLinks')}>&times;</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </fieldset>

            <div className="form-controls">
              <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (editingMemberId ? 'Save Changes' : 'Add Member')}</button>
              {editingMemberId && <button type="button" className="cancel-button" onClick={resetForm} disabled={isSubmitting}>Cancel Edit</button>}
              {draftData && <button type="button" className="clear-draft-button" onClick={() => { resetForm(); clearDraft(); }} disabled={isSubmitting}>Clear Form & Draft</button>}
            </div>
          </form>
        </section>
      )}

      {hasPermission('canManageGroups') && (
        <section className="group-management-section">
            <h3>Manage Groups</h3>
            <div className="form-group-inline">
                <div>
                    <label htmlFor="new-group-name">Add New Group</label>
                    <input id="new-group-name" type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., U16 Team" />
                </div>
                <button type="button" className="add-button" onClick={handleAddGroup}>Add Group</button>
            </div>

            <ul className="group-list">
              {groups.map(group => {
                const memberCount = groupMemberCounts.get(group.id) || 0;
                const isEditingName = editingGroupNameId === group.id;

                return (
                    <li key={group.id} className="group-management-item">
                      <div className="group-management-item-header">
                        {isEditingName ? (
                            <div className="inline-edit-form">
                                <input
                                    type="text"
                                    value={editingGroupNewName}
                                    onChange={(e) => setEditingGroupNewName(e.target.value)}
                                    className="inline-edit-input"
                                    aria-label="New group name"
                                    autoFocus
                                />
                                <div className="inline-edit-actions">
                                    <button type="button" className="save-button" onClick={handleSaveGroupName}>Save</button>
                                    <button type="button" className="cancel-button" onClick={() => setEditingGroupNameId(null)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h4>{group.name}</h4>
                                <div className="group-header-info">
                                    <span className={`group-member-count ${memberCount === 0 ? 'empty-group' : ''}`}>
                                        {memberCount} member(s)
                                    </span>
                                    <button
                                        type="button"
                                        className="edit-group-button"
                                        onClick={() => { setEditingGroupNameId(group.id); setEditingGroupNewName(group.name); }}
                                    >
                                        Edit
                                    </button>
                                    <button type="button" className="delete-group-button" onClick={() => handleDeleteGroup(group.id)}>Delete</button>
                                </div>
                            </>
                        )}
                      </div>
                      
                      <div className="subgroup-management">
                        <h5>Subgroups</h5>
                        {group.subgroups.length > 0 ? (
                            <ul className="subgroup-list">
                            {group.subgroups.map(sg => {
                                const isEditingSubgroup = editingSubgroup?.groupId === group.id && editingSubgroup?.originalName === sg;
                                return (
                                    <li key={sg} className="subgroup-list-item">
                                        {isEditingSubgroup ? (
                                            <div className="inline-edit-form">
                                                <input
                                                    type="text"
                                                    value={editingSubgroupNewName}
                                                    onChange={(e) => setEditingSubgroupNewName(e.target.value)}
                                                    className="inline-edit-input"
                                                    aria-label="New subgroup name"
                                                    autoFocus
                                                />
                                                <div className="inline-edit-actions">
                                                    <button type="button" className="save-button" onClick={handleSaveSubgroupName}>Save</button>
                                                    <button type="button" className="cancel-button" onClick={() => setEditingSubgroup(null)}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <span>{sg}</span>
                                                <div className="item-actions">
                                                    <button type="button" className="edit-item-button" onClick={() => { setEditingSubgroup({ groupId: group.id, originalName: sg }); setEditingSubgroupNewName(sg); }}>Edit</button>
                                                    <button type="button" className="remove-tag-button" onClick={() => handleDeleteSubgroup(group.id, sg)}>&times;</button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                            </ul>
                        ) : <p className="no-subgroups-message">No subgroups yet.</p>}
                        
                        <div className="add-subgroup-form form-group-inline">
                            <div>
                            <label htmlFor={`subgroup-for-${group.id}`} className="visually-hidden">Add Subgroup</label>
                            <input 
                                id={`subgroup-for-${group.id}`} 
                                type="text" 
                                value={editingGroupIdForSubgroup === group.id ? newSubgroupName : ''}
                                onChange={(e) => { setEditingGroupIdForSubgroup(group.id); setNewSubgroupName(e.target.value); }}
                                placeholder="Add a new subgroup..."
                            />
                            </div>
                            <button type="button" className="add-button" onClick={() => handleAddSubgroup(group.id)}>Add</button>
                        </div>
                      </div>
                    </li>
                );
              })}
            </ul>
        </section>
      )}

      {hasPermission('canImportExport') && (
        <section className="data-management-section">
            <h3>Data Management</h3>
            <div className="data-controls">
                <button type="button" className="export-button" onClick={() => setShowExportConfirm(true)}>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Export Data
                </button>
                <input type="file" ref={importFileRef} onChange={handleImportChange} accept=".json" style={{display: 'none'}} />
                <button type="button" className="import-button" onClick={() => importFileRef.current?.click()}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 20h14v-2H5v2zm7-17l-7 7h4v6h6v-6h4l-7-7z"/></svg>
                    Import from JSON
                </button>
            </div>
            <div className="csv-import-section">
              <h4>Bulk Import from CSV</h4>
              <p>Prepare your data in a spreadsheet using our template, then upload it here to add or update members in bulk. Existing members are matched by email.</p>
              <div className="data-controls">
                <button type="button" className="secondary-button" onClick={downloadCsvTemplate}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                  Download CSV Template
                </button>
                <input type="file" ref={csvFileRef} onChange={handleCsvImport} accept=".csv,text/csv" style={{display: 'none'}} />
                <button type="button" className="import-button" onClick={() => csvFileRef.current?.click()} disabled={isSubmitting}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                  Upload CSV
                </button>
              </div>
            </div>
        </section>
      )}
      
      <section className="members-section" aria-labelledby="members-heading">
        <div className="section-header">
          <h2 id="members-heading">Members</h2>
          <span className="member-count">({filteredMembers.length} of {members.length})</span>
        </div>
        <div className="members-controls">
            <div className="filter-group">
                <div ref={searchContainerRef} className="search-bar">
                    <label htmlFor="search" className="visually-hidden">Search Members</label>
                    <input 
                      id="search" 
                      type="search" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => addRecentSearch(searchTerm)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addRecentSearch(searchTerm); }}
                      onFocus={() => setIsRecentSearchesOpen(true)}
                      placeholder="Search by Full Name, Role, Email..." 
                      autoComplete="off"
                    />
                    {isRecentSearchesOpen && recentSearches.length > 0 && (
                        <div className="recent-searches-dropdown">
                            <ul>
                                {recentSearches.map((term, index) => (
                                    <li key={index} onClick={() => handleSelectRecentSearch(term)} onKeyDown={e => {if (e.key === 'Enter') handleSelectRecentSearch(term)}} tabIndex={0}>
                                        {term}
                                    </li>
                                ))}
                            </ul>
                            <div className="recent-searches-actions">
                                <button type="button" onClick={handleClearRecentSearches}>Clear Recent Searches</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="select-wrapper status-filter">
                    <label htmlFor="status-filter" className="visually-hidden">Filter by Status</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                    <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as (MemberStatus | 'All'))}>
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                    </select>
                </div>
                 <div className="select-wrapper status-filter">
                    <label htmlFor="memberType-filter" className="visually-hidden">Filter by Member Type</label>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                    <select id="memberType-filter" value={memberTypeFilter} onChange={(e) => setMemberTypeFilter(e.target.value as (MemberType | 'All'))}>
                        <option value="All">All Types</option>
                        {ALL_MEMBER_TYPES.map(type => (
                           <option key={type} value={type}>{type === 'N/A' ? 'Not Applicable' : type.replace(/([A-Z])/g, ' $1').trim()}</option>
                        ))}
                    </select>
                </div>
                <div ref={affiliationFilterRef} className="affiliation-filter">
                    <label htmlFor="affiliation-filter-toggle" className="visually-hidden">Filter by Affiliation</label>
                    <button
                        type="button"
                        id="affiliation-filter-toggle"
                        className="multiselect-toggle"
                        onClick={() => setIsAffiliationFilterOpen(prev => !prev)}
                        aria-haspopup="listbox"
                        aria-expanded={isAffiliationFilterOpen}
                        disabled={allAffiliations.length === 0}
                    >
                        <span>{selectedAffiliations.length > 0 ? `${selectedAffiliations.length} affiliation(s) selected` : 'Filter by Affiliation'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>
                    </button>
                    {isAffiliationFilterOpen && (
                        <div className="multiselect-dropdown" role="listbox">
                             {allAffiliations.length > 0 ? (
                                <>
                                    <ul>
                                        {allAffiliations.map(affiliation => (
                                            <li key={affiliation}>
                                                <label>
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedAffiliations.includes(affiliation)}
                                                        onChange={() => handleAffiliationChange(affiliation)}
                                                    />
                                                    {affiliation}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                    {selectedAffiliations.length > 0 && (
                                        <div className="multiselect-actions">
                                            <button type="button" onClick={() => setSelectedAffiliations([])}>Clear Selection</button>
                                        </div>
                                    )}
                                </>
                             ) : (
                                <p className="no-options">No affiliations found.</p>
                             )}
                        </div>
                    )}
                </div>
            </div>
             <div className="sort-controls">
                <span>Sort by:</span>
                <SortButton sortKey="name" label="Full Name" />
                <SortButton sortKey="memberType" label="Type" />
                <SortButton sortKey="role" label="Role" />
                <SortButton sortKey="status" label="Status" />
                <SortButton sortKey="dateJoined" label="Date Joined" />
            </div>
        </div>

        {sortedGroupIdsInView.map(gId => {
            const group = groupMap.get(gId);
            if (!group) return null;

            const membersInGroup = groupedMembers[gId];
            const subgroupsInGroup = [...new Set(membersInGroup.map(m => m.subgroup).filter(Boolean))].sort();
            const membersWithoutSubgroup = membersInGroup.filter(m => !m.subgroup);

            return (
                <details key={gId} className="member-group" open>
                    <summary>
                        <span className="group-title">{group.name}</span>
                        <span className="group-count">{membersInGroup.length} member(s)</span>
                    </summary>
                    <div className="members-grid-container">
                        {membersWithoutSubgroup.length > 0 && (
                             <div className="members-grid">
                                {membersWithoutSubgroup.map(member => <MemberCard key={member.id} member={member} />)}
                            </div>
                        )}
                        {subgroupsInGroup.map(sg => (
                            <div key={sg} className="subgroup-container">
                                <h4 className="subgroup-title">{sg}</h4>
                                <div className="members-grid">
                                    {membersInGroup.filter(m => m.subgroup === sg).map(member => (
                                        <MemberCard key={member.id} member={member} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </details>
            );
        })}

        {unassignedMembers.length > 0 && (
            <details className="member-group" open>
                <summary>
                    <span className="group-title">Unassigned</span>
                    <span className="group-count">{unassignedMembers.length} member(s)</span>
                </summary>
                <div className="members-grid-container">
                    <div className="members-grid">
                        {unassignedMembers.map(member => <MemberCard key={member.id} member={member} />)}
                    </div>
                </div>
            </details>
        )}
        
        {filteredMembers.length === 0 && <p>No members found matching your criteria.</p>}
      </section>

      {isCameraOpen && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-heading">
            <div className="camera-modal-content">
                <h3 id="camera-heading">Take Photo</h3>
                <video ref={videoRef} autoPlay playsInline className="camera-feed"></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                <div className="camera-controls">
                    <button onClick={capturePhoto}>Capture</button>
                    <button onClick={closeCamera} className="close-button">Close</button>
                </div>
            </div>
        </div>
      )}

      {selectedMember && <MemberDetailModal member={selectedMember} />}
      
      {showExportConfirm && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="export-heading">
          <div className="confirm-modal-content">
            <h3 id="export-heading">Export Data</h3>
            <p>This will download a JSON file containing all member and group data. Keep this file in a safe place as a backup.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-button-export" onClick={executeExport}>Confirm & Export</button>
              <button className="cancel-button" onClick={() => setShowExportConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showImportConfirm && importFileData && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="import-heading">
          <div className="confirm-modal-content">
            <h3 id="import-heading">Confirm Import</h3>
            <p>You are about to <strong>overwrite all current data</strong> with the contents of this file. This action cannot be undone.</p>
            <p>
                File contains: <strong>{importFileData.members.length}</strong> members and <strong>{importFileData.groups.length}</strong> groups.
            </p>
            <div className="confirm-modal-actions">
              <button className="confirm-button-import" onClick={executeImport}>Overwrite & Import</button>
              <button className="cancel-button" onClick={() => { setShowImportConfirm(false); setImportFileData(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCsvImportConfirm && csvImportData && (
        <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="csv-import-heading">
          <div className="csv-confirm-modal-content">
            <h3 id="csv-import-heading">CSV Import Preview</h3>
            <p>Please review the changes before confirming. Existing members are matched by email.</p>
            <div className="csv-summary">
              <p><strong>New Members:</strong> {csvImportData.newMembers.length}</p>
              <p><strong>Members to Update:</strong> {csvImportData.updatedMembers.length}</p>
              <p><strong>Skipped Rows (Errors):</strong> {csvImportData.errors.length}</p>
            </div>
            {csvImportData.errors.length > 0 && (
              <div className="csv-error-list">
                <h4>Errors Found:</h4>
                <ul>
                  {csvImportData.errors.slice(0, 5).map(err => <li key={err.row}><strong>Row {err.row}:</strong> {err.message}</li>)}
                </ul>
                {csvImportData.errors.length > 5 && <p>...and {csvImportData.errors.length - 5} more errors.</p>}
              </div>
            )}
            <div className="confirm-modal-actions">
              <button className="confirm-button-import" onClick={executeCsvImport} disabled={isSubmitting || (csvImportData.newMembers.length === 0 && csvImportData.updatedMembers.length === 0)}>
                {isSubmitting ? 'Importing...' : 'Confirm Import'}
              </button>
              <button className="cancel-button" onClick={() => { setShowCsvImportConfirm(false); setCsvImportData(null); }} disabled={isSubmitting}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {isDashboardOpen && dashboardStats && (
          <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-heading">
              <div className="dashboard-modal-content">
                  <h2 id="dashboard-heading">Admin Dashboard</h2>
                   <button type="button" onClick={() => setIsDashboardOpen(false)} className="close-modal-button" aria-label="Close dashboard">&times;</button>
                  <div className="dashboard-grid">
                      <div className="dashboard-widget">
                          <h3>Total Members</h3>
                          <p className="dashboard-stat-large">{dashboardStats.totalMembers}</p>
                      </div>
                      <div className="dashboard-widget">
                          <h3>Status Breakdown</h3>
                          <ul className="dashboard-list">
                              <li><span className="status-dot status-active"></span>Active <strong>{dashboardStats.statusCounts.Active}</strong></li>
                              <li><span className="status-dot status-inactive"></span>Inactive <strong>{dashboardStats.statusCounts.Inactive}</strong></li>
                              <li><span className="status-dot status-pending"></span>Pending <strong>{dashboardStats.statusCounts.Pending}</strong></li>
                          </ul>
                          <div className="status-distribution-bar" role="progressbar" aria-label="Status distribution">
                              {dashboardStats.totalMembers > 0 && <>
                                <div className="status-segment status-active" style={{width: `${(dashboardStats.statusCounts.Active / dashboardStats.totalMembers) * 100}%`}} title="Active"></div>
                                <div className="status-segment status-inactive" style={{width: `${(dashboardStats.statusCounts.Inactive / dashboardStats.totalMembers) * 100}%`}} title="Inactive"></div>
                                <div className="status-segment status-pending" style={{width: `${(dashboardStats.statusCounts.Pending / dashboardStats.totalMembers) * 100}%`}} title="Pending"></div>
                              </>}
                          </div>
                      </div>
                       <div className="dashboard-widget full-width">
                          <h3>Group Breakdown</h3>
                          <div className="group-breakdown-chart">
                            {Object.entries(dashboardStats.groupCounts).sort(([, a], [, b]) => b - a).map(([name, count]) => (
                                <div key={name} className="group-bar-item">
                                    <span className="group-bar-label" title={name}>{name}</span>
                                    <div className="group-bar-wrapper">
                                        <div className="group-bar" style={{width: `${dashboardStats.maxGroupCount > 0 ? (Number(count) / dashboardStats.maxGroupCount) * 100 : 0}%`}}></div>
                                    </div>
                                    <span className="group-bar-count">{count}</span>
                                </div>
                            ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isRefundPolicyOpen && (
           <div className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="refund-policy-heading">
                <div className="refund-policy-modal-content">
                    <h3 id="refund-policy-heading">Academy Refund Policy</h3>
                     <button type="button" onClick={() => setIsRefundPolicyOpen(false)} className="close-modal-button" aria-label="Close policy">&times;</button>
                    <div className="policy-text">
                        <p>As the Academy continues to grow and shift its model of delivering sessions, we will review our policies to ensure they align with our administrative capacity and program delivery structure. We aim to provide practical, safe, fun, and sustainable programming for good value.</p>
                        <h4>The Academy Refund Policy</h4>
                        <p>We have developed a refund policy intending to strike a balance between recognizing the planning and set costs required to deliver programming as a not-for-profit entity and fairness to participants who have to miss a substantial number of sessions due to unforeseen circumstances.</p>
                        <p>The Academy offers various sessions and has different refund policies. The CEO must review all refunds that session coaches cannot approve or issue. In most situations, a refund will not be issued if the session's start date is within 7 days of the cancellation. If you believe a refund should be issued, do not hesitate to complete the form to find out.</p>
                        <h4>Single-time Sessions (One Day for a period of time)</h4>
                        <ul>
                          <li>When an athlete cannot attend, the athlete can allow another suitable athlete to attend in their spot.</li>
                          <li>An athlete who is not attending must find a suitable athlete.</li>
                          <li>It will not be the job of the Academy to find a replacement.</li>
                          <li>If a replacement is found, the name and email of the replacement must be submitted using the form before the session begins.</li>
                          <li>Not completing the form means the academy insurance will not apply, the athlete will not be able to participate, and no refund will be issued.</li>
                          <li>If it is not possible to find a replacement, the form should still be completed, stating the reason for missing, and if deemed appropriate, a refund will be applied if the form is completed 7 days before the start of the session.</li>
                        </ul>
                        <h4>Month-long Multiday Sessions (Same Focus Spread over a Single month)</h4>
                        <ul>
                            <li>Month-long sessions are designed to build upon past sessions, making it impossible for an athlete to enter a single session in the middle. For this reason, no replacement athlete process can be applied to these sessions.</li>
                            <li>During a month, an athlete might miss a single session here or there. However, a refund will only be issued if it is for a group of more than three sessions and due to injury, family emergencies, illness or for reasons approved by the Academy.</li>
                            <li>A request for a refund must be submitted at least 7 days before the missed sessions and not after the return to active status or the end of the month.</li>
                            <li>The request must be made on the form found on the registration at the bottom of the site. (Refund Form)</li>
                        </ul>
                        {/* Add other policy sections here */}
                    </div>
                </div>
           </div>
      )}

    </main>
  );

  function MemberCard({ member }: { member: Member }) {
    const isExiting = member.id === deletingMemberId;
    return (
        <div 
            className={`member-card ${isExiting ? 'exiting' : ''}`}
            onClick={() => setSelectedMember(member)}
            onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') setSelectedMember(member)}}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${member.name}`}
        >
          <img 
            className="member-image" 
            src={member.imageUrl || generateAvatar(member.name, member.id)} 
            alt={`Profile picture of ${member.name}`}
            loading="lazy"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== generateAvatar(member.name, member.id)) {
                    target.src = generateAvatar(member.name, member.id);
                }
            }}
          />
          <div className="member-card-content">
            <div className="member-card-header">
              <h3>{member.name}</h3>
              <span className={`status-badge status-${member.status.toLowerCase()}`}>{member.status}</span>
            </div>
            <p className="role">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>{member.role}</span>
            </p>
            {member.affiliations && member.affiliations.length > 0 && (
                <div className="card-affiliations">
                    <svg className="affiliation-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L8 12v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                     <div className="affiliation-tags-wrapper">
                        {member.affiliations.map(aff => <span key={aff} className="affiliation-tag-display">{aff}</span>)}
                    </div>
                </div>
            )}
            <div className="member-bio rich-text-content" dangerouslySetInnerHTML={{ __html: member.bio }}></div>
             <div className="member-card-actions">
                {hasPermission('canEditMembers') && <button type="button" className="edit-button" onClick={(e) => handleEdit(e, member)}>Edit</button>}
                {hasPermission('canDeleteMembers') && <button type="button" className="delete-button" onClick={(e) => handleDelete(e, member)}>Delete</button>}
             </div>
          </div>
        </div>
    );
  }

  function MemberDetailModal({ member }: { member: Member | null }) {
    if (!member) return null;

    const group = member.groupId ? groupMap.get(member.groupId) : null;
    const groupPath = [group?.name, member.subgroup].filter(Boolean).join(' / ');
    const age = calculateAge(member.birthdate);
    const relatedMember = member.relationship ? memberMap.get(member.relationship.relatedMemberId) : null;

    return (
      <div className="member-detail-modal" role="dialog" aria-modal="true" aria-labelledby="member-detail-heading">
        <div className="member-detail-modal-content">
          <button type="button" onClick={() => setSelectedMember(null)} className="close-modal-button" aria-label="Close member details">&times;</button>
          <img 
            className="member-detail-image" 
            src={member.imageUrl || generateAvatar(member.name, member.id)} 
            alt={`Profile picture of ${member.name}`}
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== generateAvatar(member.name, member.id)) {
                    target.src = generateAvatar(member.name, member.id);
                }
            }}
          />
          <h3 id="member-detail-heading">{member.name}</h3>
          <span className={`status-badge status-${member.status.toLowerCase()}`}>{member.status}</span>
          <p className="role">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
             <span>{member.role}</span>
          </p>
          <div className="member-detail-bio rich-text-content" dangerouslySetInnerHTML={{ __html: member.bio }}></div>
          
           <div className="member-detail-grid">
              <div className="detail-section">
                <h4>Primary Information</h4>
                <dl>
                    <dt>Member Type</dt><dd>{member.memberType || 'N/A'}</dd>
                    <dt>Group</dt><dd>{groupPath || 'Unassigned'}</dd>
                    <dt>Joined On</dt><dd>{member.dateJoined ? new Date(member.dateJoined).toLocaleDateString() : 'N/A'}</dd>
                    <dt>Created On</dt><dd>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}</dd>
                    <dt>Last Active</dt><dd>{member.lastActive ? new Date(member.lastActive).toLocaleString() : 'N/A'}</dd>
                </dl>
              </div>

               <div className="detail-section">
                <h4>Contact & Personal</h4>
                <dl>
                    <dt>Email</dt><dd>{member.email || 'N/A'}</dd>
                    <dt>Phone</dt><dd>{member.phone || 'N/A'}</dd>
                    <dt>Address</dt><dd>{member.address || 'N/A'}</dd>
                    <dt>Birthdate</dt><dd>{member.birthdate ? new Date(member.birthdate).toLocaleDateString() : 'N/A'}</dd>
                    <dt>Age</dt><dd>{age !== null ? age : 'N/A'}</dd>
                    <dt>Gender</dt><dd>{member.gender || 'N/A'}</dd>
                    <dt>Relationship</dt>
                    <dd className="relationship-display">
                        {relatedMember ? (
                            <span>
                                {member.relationship?.relationshipType}{' '}
                                <button className="link-button" onClick={() => setSelectedMember(relatedMember)}>{relatedMember.name}</button>
                            </span>
                        ) : 'None'}
                    </dd>
                    <dt>Member ID</dt>
                    <dd className="member-id-display">
                        <span title={member.id}>{member.id.substring(0, 8)}...</span>
                         <button type="button" className="copy-id-button" onClick={() => handleCopyId(member.id)} disabled={isIdCopied}>
                            {isIdCopied ? (
                                <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9 16.2l-3.5-3.5a1 1 0 0 1 1.4-1.4L9 13.4l7.1-7.1a1 1 0 0 1 1.4 1.4L9 16.2z"/></svg>
                                Copied!
                                </>
                            ) : (
                                <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                Copy
                                </>
                            )}
                        </button>
                    </dd>
                </dl>
              </div>

               <div className="detail-section full-width">
                <h4>Education & Volleyball History</h4>
                 <dl>
                    <dt>Elementary</dt><dd>{member.elementarySchool || 'N/A'}</dd>
                    <dt>High School</dt><dd>{member.highSchool || 'N/A'}</dd>
                    <dt>School Level</dt><dd>{member.schoolVolleyballLevel || 'N/A'}</dd>
                    <dt>Club</dt><dd>{member.clubVolleyball || 'N/A'}</dd>
                </dl>
              </div>

              {member.affiliations && member.affiliations.length > 0 && (
                <div className="detail-section affiliations-list full-width">
                    <h4>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L8 12v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                      Affiliations
                    </h4>
                    <ul>
                        {member.affiliations.map(aff => <li key={aff}>{aff}</li>)}
                    </ul>
                </div>
              )}

                <div className="detail-section full-width">
                    <h4>Academy & Achievements</h4>
                    {member.academyLevel && member.academyLevel !== 'N/A' && (
                        <div className="academy-level-details">
                            <dl>
                                <dt>{ACADEMY_LEVELS[member.academyLevel].title}</dt>
                                <dd>{ACADEMY_LEVELS[member.academyLevel].description}</dd>
                            </dl>
                        </div>
                    )}
                    {member.playerVolleyballAchievements && member.playerVolleyballAchievements.length > 0 && (
                        <div className="achievements-list">
                            <h5>Player Achievements</h5>
                            <ul>{member.playerVolleyballAchievements.map(a => <li key={a}>{a}</li>)}</ul>
                        </div>
                    )}
                    {member.academyAchievements && member.academyAchievements.length > 0 && (
                        <div className="achievements-list">
                            <h5>Academy Achievements</h5>
                            <ul>{member.academyAchievements.map(a => <li key={a}>{a}</li>)}</ul>
                        </div>
                    )}
                     {member.postAcademyAchievements && member.postAcademyAchievements.length > 0 && (
                        <div className="achievements-list">
                            <h5>Post-Academy Achievements</h5>
                            <ul>{member.postAcademyAchievements.map(a => <li key={a}>{a}</li>)}</ul>
                        </div>
                    )}
                    {member.academySessionsAttended && member.academySessionsAttended.length > 0 && (
                         <div className="achievements-list">
                            <h5>Sessions Attended</h5>
                            <ul>{member.academySessionsAttended.map(a => <li key={a}>{a}</li>)}</ul>
                        </div>
                    )}
                    <dl>
                      <dt>Total Sessions</dt><dd>{member.totalAcademySessions || 'N/A'}</dd>
                      <dt>Total Hours</dt><dd>{member.academyHours || 'N/A'}</dd>
                      <dt>Coaches</dt><dd>{member.academyCoaches || 'N/A'}</dd>
                    </dl>
                    {member.sessionsFeedback && (
                        <div className="feedback-block">
                            <h5>Sessions Feedback</h5>
                            <p>{member.sessionsFeedback}</p>
                        </div>
                    )}
                    {member.coachFeedback && (
                         <div className="feedback-block">
                            <h5>Coach Feedback</h5>
                            <p>{member.coachFeedback}</p>
                        </div>
                    )}
                </div>

                {member.sessionCancellations && member.sessionCancellations.length > 0 && (
                    <div className="detail-section full-width">
                        <h4>Session Cancellations</h4>
                        <div className="cancellation-detail-list">
                            {member.sessionCancellations.map(c => (
                                <div key={c.id} className="cancellation-detail-item">
                                    <h5>{c.sessionName}</h5>
                                    <p className="cancellation-reason">{c.reason}</p>
                                    <div className="cancellation-meta">
                                        <span><strong>Date:</strong> {new Date(c.cancellationDate).toLocaleDateString()}</span>
                                        <span><strong>Refunded:</strong> {c.refundIssued ? 'Yes' : 'No'}</span>
                                        <span><strong>Fits Policy:</strong> {c.fitsRefundPolicy ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="detail-section full-width">
                    <h4>Communications & Logs</h4>
                     {member.communications && member.communications.length > 0 && (
                        <div className="log-display-section">
                            <h5>Communications Log</h5>
                            <div className="log-detail-list">
                                {member.communications.map(c => (
                                    <div key={c.id} className="log-detail-item">
                                        <strong>{c.subject} <span className="log-item-meta">({c.type} on {new Date(c.date).toLocaleDateString()})</span></strong>
                                        <p>{c.notes}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                     {member.coachCommentsLog && member.coachCommentsLog.length > 0 && (
                         <div className="log-display-section">
                            <h5>Coach Comments</h5>
                            <div className="log-detail-list">
                                {member.coachCommentsLog.map(c => (
                                    <div key={c.id} className="log-detail-item">
                                        <p>{c.comment}</p>
                                        <span className="log-item-meta">Logged on {new Date(c.date).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                     {member.photoLinks && member.photoLinks.length > 0 && (
                        <div className="log-display-section">
                            <h5>Photo Links</h5>
                            <div className="log-detail-list">
                                {member.photoLinks.map(l => (
                                    <div key={l.id} className="log-detail-item">
                                        <strong>{l.description}</strong>
                                        <p><a href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                </div>

          </div>

          <div className="member-detail-activity-log">
            <h4>Activity Log</h4>
            <ul>
              {member.activityLog && member.activityLog.length > 0 ? (
                member.activityLog.map((log, index) => (
                    <li key={index}>
                      <span className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                      <p className="log-event">{log.event}</p>
                    </li>
                ))
              ) : (
                <li>No activity recorded.</li>
              )}
            </ul>
          </div>

        </div>
      </div>
    );
  }

};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);