import type { Meta, StoryObj } from "@storybook/react";
import { BarChart3, BookOpen, FileText, Users } from "lucide-react";
import { useState } from "react";

import { Tabs } from "./Tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

function BasicTabsDemo() {
  const [active, setActive] = useState("overview");
  return (
    <Tabs
      activeTab={active}
      onChange={setActive}
      tabs={[
        { id: "overview", label: "Ringkasan" },
        { id: "modules", label: "Modul" },
        { id: "students", label: "Siswa" },
      ]}
    />
  );
}

export const Default: Story = {
  render: () => <BasicTabsDemo />,
};

function TabsWithIconsDemo() {
  const [active, setActive] = useState("lessons");
  return (
    <Tabs
      activeTab={active}
      onChange={setActive}
      tabs={[
        {
          id: "lessons",
          label: "Materi",
          icon: <BookOpen className="w-4 h-4" />,
        },
        {
          id: "assignments",
          label: "Tugas",
          icon: <FileText className="w-4 h-4" />,
        },
        {
          id: "analytics",
          label: "Analitik",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ]}
    />
  );
}

export const WithIcons: Story = {
  render: () => <TabsWithIconsDemo />,
};

function TabsWithCountsDemo() {
  const [active, setActive] = useState("students");
  return (
    <Tabs
      activeTab={active}
      onChange={setActive}
      tabs={[
        {
          id: "students",
          label: "Siswa",
          count: 32,
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: "assignments",
          label: "Tugas",
          count: 5,
          icon: <FileText className="w-4 h-4" />,
        },
        {
          id: "analytics",
          label: "Analitik",
          icon: <BarChart3 className="w-4 h-4" />,
        },
      ]}
    />
  );
}

export const WithCounts: Story = {
  render: () => <TabsWithCountsDemo />,
};

function ManyTabsDemo() {
  const [active, setActive] = useState("tab1");
  return (
    <Tabs
      activeTab={active}
      onChange={setActive}
      tabs={[
        { id: "tab1", label: "Pertama" },
        { id: "tab2", label: "Kedua" },
        { id: "tab3", label: "Ketiga" },
        { id: "tab4", label: "Keempat" },
        { id: "tab5", label: "Kelima" },
      ]}
    />
  );
}

export const ManyTabs: Story = {
  render: () => <ManyTabsDemo />,
};
