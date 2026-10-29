import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  TabType,
} from './components/Sidebar';
import { FleetCockpit } from './components/FleetCockpit';
import { MonitorsTable } from './components/MonitorsTable';
import { AuditEngine } from './components/AuditEngine';
import { IncidentCenter } from './components/IncidentCenter';
import { BillingView } from './components/BillingView';
import { AlertSettings } from './components/AlertSettings';
import { ClientReport } from './components/ClientReport';
import { PitchDeck } from './components/PitchDeck';
import { AddMonitorModal } from './components/AddMonitorModal';
import { LandingPage } from './components/LandingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AuthModal } from './components/AuthModal';
import { SuperadminCockpit } from './components/SuperadminCockpit';
import { SharedReportViewer } from './components/SharedReportViewer';
import { Plus, Globe, Sparkles, User } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  status: string;
  lastUptimeState: 'up' | 'down' | 'check_failed';
  uptimePercentage: number;
  latestResponseTimeMs: number | null;
  sslDaysUntilExpiry: number | null;
  sslValid: boolean | null;
  sslIssuer: string | null;
  lastUptimeCheckAt: string | null;
  recentHistory: { checkedAt: string; outcome: string; responseTimeMs: number }[];
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'superadmin';
  status?: 'active' | 'suspended';
  planId: string;
  planName: string;
  maxSites: number;
  uptimeIntervalMinutes: number;
  billingCycle: string;
  currentSitesCount: number;
}

interface Incident {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  status: string;
  statusCode: number | null;
  cause: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

interface Finding {
  ruleCode: string;
  category: 'seo' | 'security' | 'performance' | 'usability';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  details: string;
  remediation: string;
  pageUrl: string;
}

interface CategoryScore {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issuesCount: number;
}

interface ScanResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  durationMs: number;
  htmlSizeKb: number;
  healthScore: number;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    seo: CategoryScore;
    security: CategoryScore;
    performance: CategoryScore;
    usability: CategoryScore;
  };
  title: string | null;
  metaDescription: string | null;
  h1List: string[];
  openGraph: {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
  };
  securityHeaders: {
    hsts: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    contentSecurityPolicy: boolean;
  };
  mixedContent: { tag: string; url: string }[];
  totalImages: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
  brokenLinks: { url: string; statusCode: number }[];
  findings: Finding[];
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // SaaS Fleet State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isCheckingProject, setIsCheckingProject] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Scanner State
  const [scanUrl, setScanUrl] = useState('https://stripe.com');
  const [quickScanUrl, setQuickScanUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('sitepulse_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Initial Data Fetch
  useEffect(() => {
    const token = localStorage.getItem('sitepulse_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Expired session');
        })
        .then((data) => {
          setUserProfile(data.user);
          fetchInitialData();
        })
        .catch(() => {
          localStorage.removeItem('sitepulse_token');
        });
    }
  }, []);

  const fetchInitialData = async () => {
    try {
      await Promise.all([fetchProjects(), fetchUserProfile(), fetchIncidents()]);
    } catch {
      // Graceful fallback
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Projects fetch error:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('User profile fetch error:', err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error('Incidents fetch error:', err);
    }
  };

  const handleAuthSuccess = (token: string, user: UserProfile) => {
    localStorage.setItem('sitepulse_token', token);
    setUserProfile(user);
    setShowAuthModal(false);
    fetchInitialData();
    navigate('/cockpit');
  };

  const handleLogout = () => {
    localStorage.removeItem('sitepulse_token');
    setUserProfile(null);
    setProjects([]);
    setIncidents([]);
    navigate('/');
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (selectedProject?.id === id) setSelectedProject(null);
        await Promise.all([fetchProjects(), fetchUserProfile()]);
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  const handleUpdateProject = async (id: string, updates: { name?: string; baseUrl?: string; status?: string }) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await Promise.all([fetchProjects(), fetchUserProfile()]);
      }
    } catch (err) {
      console.error('Update project failed:', err);
    }
  };

  const handleRunScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || 'Diagnostic scan failed.');
      } else {
        setScanResult(data.auditResult);
      }
    } catch (err: any) {
      setScanError(err.message || 'Scanner service unavailable.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunScanUrl = (url: string) => {
    setScanUrl(url);
    setIsScanning(true);
    setScanError(null);

    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.auditResult) {
          setScanResult(data.auditResult);
        } else {
          setScanError(data.error || 'Scan failed.');
        }
      })
      .catch((err) => setScanError(err.message))
      .finally(() => setIsScanning(false));
  };

  const handleCheckNow = async (projectId: string) => {
    setIsCheckingProject(true);
    try {
      await fetch(`/api/projects/${projectId}/check`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      await fetchProjects();
      if (selectedProject?.id === projectId) {
        const res = await fetch(`/api/projects/${projectId}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        setSelectedProject(data.project);
      }
    } finally {
      setIsCheckingProject(false);
    }
  };

  const handleAddProject = async (name: string, url: string) => {
    setIsAddingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, baseUrl: url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add project.');
      }

      await fetchProjects();
      await fetchUserProfile();
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleUpdatePlan = async (planId: string, billingCycle = 'monthly') => {
    setIsUpdatingPlan(true);
    try {
      const res = await fetch('/api/user/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
      }
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleShareReport = async () => {
    if (!scanResult) return;
    try {
      const res = await fetch('/api/reports/demo-scan/share', { method: 'POST' });
      const data = await res.json();
      const generated = window.location.origin + data.shareUrl;
      setShareUrl(generated);
      navigator.clipboard.writeText(generated);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 3000);
    } catch {
      const fallbackUrl = `${window.location.origin}/report/share-${Date.now().toString(36)}`;
      setShareUrl(fallbackUrl);
      navigator.clipboard.writeText(fallbackUrl);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 3000);
    }
  };

  const openIncidents = incidents.filter((i) => i.status === 'open');

  // 1. Dedicated Public Shared Audit Report Link: /report/:token
  if (location.pathname.startsWith('/report/') && location.pathname !== '/report') {
    return <SharedReportViewer />;
  }

  // 2. Tab Navigation & Deep Link Resolution
  const validTabs: TabType[] = [
    'cockpit',
    'monitors',
    'audit',
    'incidents',
    'billing',
    'notifications',
    'report',
    'pitch',
    'superadmin',
  ];
  const segment = location.pathname.replace(/^\//, '').toLowerCase();
  const currentTab: TabType = validTabs.includes(segment as TabType)
    ? (segment as TabType)
    : 'cockpit';

  const isPublicLanding =
    location.pathname === '/' &&
    (!localStorage.getItem('sitepulse_token') || location.search.includes('preview=true'));

  // If in Public Landing Mode, render the Landing Page
  if (isPublicLanding) {
    return (
      <>
        {location.search.includes('preview=true') && (
          <div className="bg-cyan-950/90 border-b border-cyan-800/80 px-4 py-2 flex items-center justify-between text-xs text-pulse-cyan font-mono sticky top-0 z-50">
            <span>Storefront Preview Mode (Viewing public marketing page as visitor)</span>
            <button
              onClick={() => navigate('/cockpit')}
              className="px-2.5 py-1 bg-pulse-cyan text-slate-950 font-bold rounded cursor-pointer hover:bg-cyan-300"
            >
              Return to Cockpit &rarr;
            </button>
          </div>
        )}
        <LandingPage
          onEnterCockpit={() => {
            const token = localStorage.getItem('sitepulse_token');
            if (token && userProfile) {
              navigate('/cockpit');
            } else {
              setShowAuthModal(true);
            }
          }}
          onOpenOnboarding={() => setShowAuthModal(true)}
          onRunAuditFromLanding={(url) => {
            handleRunScanUrl(url);
            navigate('/audit');
          }}
        />
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={async (url, _interval, _email) => {
            try {
              const parsed = new URL(url);
              await handleAddProject(parsed.hostname, url);
            } catch {
              await handleAddProject('My Client Domain', url);
            }
            setShowOnboarding(false);
            navigate('/cockpit');
          }}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // If logged in and visiting /, navigate into cockpit
  if (location.pathname === '/') {
    navigate('/cockpit', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-[#080c18] text-slate-100 font-sans antialiased ambient-mesh">
      {/* SaaS Persistent Sidebar Rail */}
      <Sidebar
        activeTab={currentTab}
        setActiveTab={(tab) => navigate('/' + tab)}
        userProfile={userProfile}
        openBillingModal={() => navigate('/billing')}
        openIncidentCount={openIncidents.length}
        openAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0a0f1d]/85 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Workspace /
            </span>
            <span className="text-xs font-bold text-white capitalize font-mono">
              {currentTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Account Switcher / Sign In */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="clay-btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Switch user account or sign in"
            >
              <User className="w-3.5 h-3.5 text-pulse-cyan" />
              <span className="hidden sm:inline">
                {userProfile ? userProfile.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            {/* Toggle to Public Landing Storefront */}
            <button
              onClick={() => navigate('/?preview=true')}
              className="clay-btn-secondary px-3.5 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Preview public marketing storefront as a normal visitor"
            >
              <Globe className="w-3.5 h-3.5 text-pulse-cyan" />
              <span className="hidden sm:inline">Public SaaS Storefront</span>
            </button>

            {/* Run Onboarding Wizard */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="clay-btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 cursor-pointer hidden md:flex"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Onboarding Wizard</span>
            </button>

            {/* Quick Add Monitor */}
            <button
              onClick={() => setShowAddModal(true)}
              className="clay-btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Monitor</span>
            </button>
          </div>
        </header>

        {/* Tab Routing Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'cockpit' && (
            <FleetCockpit
              projects={projects}
              incidents={incidents}
              onSelectProject={(p) => {
                setSelectedProject(p);
                navigate('/monitors');
              }}
              onCheckNow={handleCheckNow}
              isChecking={isCheckingProject}
              onRunScanUrl={handleRunScanUrl}
              quickScanUrl={quickScanUrl}
              setQuickScanUrl={setQuickScanUrl}
              isScanning={isScanning}
              onNavigateTab={(tab) => navigate('/' + tab)}
              onOpenAddModal={() => setShowAddModal(true)}
            />
          )}

          {currentTab === 'monitors' && (
            <MonitorsTable
              projects={projects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
              onCheckNow={handleCheckNow}
              isChecking={isCheckingProject}
              onOpenAddModal={() => setShowAddModal(true)}
              currentSitesCount={userProfile?.currentSitesCount || projects.length}
              maxSites={userProfile?.maxSites || 3}
              openBillingModal={() => navigate('/billing')}
              onDeleteProject={handleDeleteProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'audit' && (
            <AuditEngine
              scanUrl={scanUrl}
              setScanUrl={setScanUrl}
              onRunScan={handleRunScan}
              isScanning={isScanning}
              scanResult={scanResult}
              scanError={scanError}
              onShareReport={handleShareReport}
              copiedToken={copiedToken}
              onNavigateReport={() => navigate('/report')}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentCenter
              incidents={incidents}
              onOpenBilling={() => navigate('/billing')}
            />
          )}

          {currentTab === 'billing' && (
            <BillingView
              userProfile={userProfile}
              onUpdatePlan={handleUpdatePlan}
              isUpdatingPlan={isUpdatingPlan}
            />
          )}

          {currentTab === 'notifications' && <AlertSettings />}

          {currentTab === 'report' && (
            <ClientReport
              scanResult={scanResult}
              onShareReport={handleShareReport}
              copiedToken={copiedToken}
              shareUrl={shareUrl}
              onBackToAudit={() => navigate('/audit')}
            />
          )}

          {currentTab === 'pitch' && <PitchDeck />}

          {currentTab === 'superadmin' && <SuperadminCockpit />}
        </main>
      </div>

      {/* Add Monitor Modal */}
      <AddMonitorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddProject={handleAddProject}
        isAdding={isAddingProject}
        currentSitesCount={userProfile?.currentSitesCount || projects.length}
        maxSites={userProfile?.maxSites || 3}
        openBillingModal={() => navigate('/billing')}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={async (url) => {
          try {
            const parsed = new URL(url);
            await handleAddProject(parsed.hostname, url);
          } catch {
            await handleAddProject('Client Domain', url);
          }
          setShowOnboarding(false);
          navigate('/cockpit');
        }}
      />

      {/* Multi-Tenant Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
