"""Abstract base class for all job sources."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class RawJob:
    """Normalized job data from any source — common schema before DB insertion."""

    source: str
    external_id: str
    title: str
    company: str
    url: str
    location: str | None = None
    description: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    posted_at: datetime | None = None
    raw_json: dict = field(default_factory=dict)


class JobSourceBase(ABC):
    """Base class for all job source integrations."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Source name (e.g., 'adzuna', 'greenhouse')."""
        ...

    @abstractmethod
    async def search(
        self,
        keywords: list[str],
        countries: list[str] | None = None,
        domain: str | None = None,
        experience_level: str | None = None,
        max_results: int = 50,
    ) -> list[RawJob]:
        """
        Search for jobs matching the given criteria.

        Args:
            keywords: Role/position search terms
            countries: Country codes to search in (Adzuna format: us, gb, in, etc.)
            domain: Industry/domain filter
            experience_level: Entry/Mid/Senior/Lead/Executive
            max_results: Maximum number of results to return

        Returns:
            List of normalized RawJob objects
        """
        ...
