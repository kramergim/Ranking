'use client';

import { useState } from 'react';
import { ChevronDown, Info, Calendar, TrendingUp, Award, Shield, AlertTriangle } from 'lucide-react';
import PointsAllocationTable from './PointsAllocationTable';

interface CriteriaSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function SelectionCriteria() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections: CriteriaSection[] = [
    {
      id: 'eligibility',
      title: 'Eligibility Requirements',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Age Categories</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-blue-50/50 rounded-lg p-3">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Cadets</p>
                  <p className="text-sm text-gray-600">Born between 1 January 2012 and 31 December 2014</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50/50 rounded-lg p-3">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Juniors</p>
                  <p className="text-sm text-gray-600">Born between 1 January 2009 and 31 December 2011</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50/50 rounded-lg p-3">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Seniors</p>
                  <p className="text-sm text-gray-600">Born before 1 January 2009</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Additional Requirements</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Swiss nationality required</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Valid Kukkiwon Poom/Dan certificate required</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-sm text-gray-700">Compliance with international minimum performance</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'points',
      title: 'Points System',
      icon: <TrendingUp className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">How Points Work</h4>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Points are awarded based on performance in international competitions. Tournament coefficients
              (1-5 based on importance) are used to weight results accordingly.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">Point Attribution Rules:</p>
              <ul className="space-y-1.5 ml-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Placement points awarded based on final ranking in the competition</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Additional points awarded for each match won</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700"><span className="font-semibold">Minimum 2 wins required</span> for medals to count toward points</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Points Allocation Table */}
          <PointsAllocationTable />
        </div>
      ),
    },
    {
      id: 'carryover',
      title: 'Carry-Over Rules',
      icon: <TrendingUp className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Standard Carry-Over</h4>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">40% of points</span> from the previous year are carried over to the new season
            </p>
          </div>

          <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-200/50">
            <h4 className="font-semibold text-gray-900 mb-2">New Age Category Rules</h4>
            <div>
              <p className="text-sm text-gray-700 mb-2">
                For athletes entering a new age category:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Only <span className="font-semibold">20% of previous points</span> are carried over</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-gray-700">Carry-over applies only after earning at least <span className="font-semibold">5 points in a Coefficient 2 tournament</span> in the new year</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'exceptional',
      title: 'Exceptional Circumstances (Force Majeure)',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50/50 rounded-lg p-4 border border-orange-200/50">
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              Swiss Taekwondo may select an athlete outside the standard points-based process in exceptional circumstances.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Example:</span> Injury during the selection period that prevented competition participation
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  All decisions are taken fairly and in the best interest of the sport and athlete development
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'obligations',
      title: 'Obligations & Code of Conduct',
      icon: <Award className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Athlete Responsibilities</h4>
            <div className="space-y-3">
              <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-200/50">
                <p className="text-sm font-semibold text-gray-900 mb-1">Mandatory Training Camps</p>
                <p className="text-sm text-gray-700">
                  Selected athletes must participate in official preparatory training camps organized by Swiss Taekwondo
                </p>
              </div>
              <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-200/50">
                <p className="text-sm font-semibold text-gray-900 mb-1">Code of Ethics</p>
                <p className="text-sm text-gray-700">
                  All athletes must commit to the Swiss Taekwondo Code of Ethics. Any violation may result in disqualification from selection
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200/50">
            <h4 className="font-semibold text-gray-900 mb-2">Federation Rights</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Swiss Taekwondo reserves the right to adjust selection criteria or competition calendars
              due to exceptional circumstances or regulatory changes. All adjustments will be communicated
              transparently to athletes and coaches.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mb-12">
      <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg border border-white/40 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-rose-950 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Selection Criteria & Eligibility
              </h2>
              <p className="text-white/90 text-sm mt-1">
                Official guidelines for athlete selection to major events
              </p>
            </div>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="divide-y divide-gray-200">
          {sections.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    {section.icon}
                  </div>
                  <span className="font-semibold text-gray-900">{section.title}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openSection === section.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openSection === section.id && (
                <div className="px-6 pb-6 pt-2 bg-gray-50/30">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
