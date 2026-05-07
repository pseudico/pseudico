import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactFieldsEditor, validateContactFormValues } from "../src";

describe("ContactForm validation", () => {
  it("requires a non-empty contact name", () => {
    expect(validateContactFormValues({ name: "   " })).toEqual({
      name: "Contact name is required."
    });
  });

  it("accepts a trimmed contact name", () => {
    expect(validateContactFormValues({ name: "  Alex Chen  " })).toEqual({});
  });
});

describe("ContactFieldsEditor", () => {
  it("renders existing editable fields and add-field controls", () => {
    const html = renderToStaticMarkup(
      <ContactFieldsEditor
        fields={[
          {
            id: "contact_field_1",
            label: "Email",
            value: "alex@example.com",
            type: "email",
            sortOrder: 10
          }
        ]}
        onAddField={() => undefined}
        onUpdateField={() => undefined}
      />
    );

    expect(html).toContain("Profile fields");
    expect(html).toContain("Email");
    expect(html).toContain("alex@example.com");
    expect(html).toContain("Save");
    expect(html).toContain("Add");
  });
});
